#!/usr/bin/env bash
# Testes do up.sh. Não sobe nada: validações usam `docker compose config` real;
# o fluxo completo usa um `docker` falso que só registra as chamadas.
#   ./up.test.sh
set -uo pipefail
AQUI=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
FALHAS=0
TOTAL=0

novo_dir() {
  local d; d=$(mktemp -d)
  cp "$AQUI"/{up.sh,docker-compose.prod.yml,.env.example,Caddyfile,backup.sh,restore.sh} "$d"/
  echo "$d"
}

# env_valido DIR — .env mínimo aceito pelo up.sh
env_valido() {
  cat > "$1/.env" <<EOF
ZELAR_DOMAIN=zelium.suaempresa.com.br
POSTGRES_PASSWORD=$(printf 'p%.0s' {1..24})
JWT_SECRET=$(printf 'j%.0s' {1..48})
BOOTSTRAP_GESTOR_EMAIL=dono@empresa.test
BOOTSTRAP_GESTOR_SENHA=SenhaDoDono@2026
EOF
}

# caso NOME ESPERADO_EXIT TRECHO_NA_SAIDA DIR [ARGS...]
caso() {
  local nome=$1 exit_esperado=$2 trecho=$3 dir=$4; shift 4
  local saida codigo
  saida=$(cd "$dir" && ./up.sh "$@" 2>&1); codigo=$?
  TOTAL=$((TOTAL + 1))
  if [ "$codigo" -ne "$exit_esperado" ] || ! grep -qF -- "$trecho" <<<"$saida"; then
    FALHAS=$((FALHAS + 1))
    echo "✗ $nome (exit=$codigo, esperado $exit_esperado; trecho '$trecho')"; echo "$saida" | sed 's/^/    /'
  else
    echo "✓ $nome"
  fi
}

d=$(novo_dir); caso "sem .env em --check" 1 ".env não existe" "$d" --check --no-prompt

d=$(novo_dir); cp "$d/.env.example" "$d/.env"
caso "exemplo cru é recusado (segredos de exemplo)" 1 "POSTGRES_PASSWORD" "$d" --check --no-prompt
caso "exemplo cru: JWT_SECRET também" 1 "JWT_SECRET" "$d" --check --no-prompt

d=$(novo_dir); env_valido "$d"
caso ".env válido com bootstrap passa" 0 "Configuração válida (https://zelium.suaempresa.com.br)" "$d" --check --no-prompt

d=$(novo_dir); env_valido "$d"; sed -i 's/^BOOTSTRAP_GESTOR_SENHA=.*/BOOTSTRAP_GESTOR_SENHA=curta/' "$d/.env"
caso "senha de bootstrap curta" 1 "12+ caracteres" "$d" --check --no-prompt

d=$(novo_dir); env_valido "$d"; sed -i '/^BOOTSTRAP_GESTOR_SENHA=/d' "$d/.env"
caso "e-mail de bootstrap sem senha" 1 "BOOTSTRAP_GESTOR_SENHA" "$d" --check --no-prompt

d=$(novo_dir); env_valido "$d"; sed -i '/^BOOTSTRAP_/d' "$d/.env"
caso "sem bootstrap só avisa (servidor existente)" 0 "Sem BOOTSTRAP_GESTOR_*" "$d" --check --no-prompt

d=$(novo_dir); env_valido "$d"; sed -i 's|^ZELAR_DOMAIN=.*|ZELAR_DOMAIN=https://x.example.com/|' "$d/.env"
caso "domínio com esquema é recusado" 1 "só o domínio" "$d" --check --no-prompt

d=$(novo_dir); env_valido "$d"; echo "SELF_SERVICE_ENABLED=true" >> "$d/.env"
caso "cadastro público sem SMTP é recusado" 1 "exigem SMTP real" "$d" --check --no-prompt

d=$(novo_dir); env_valido "$d"
printf '%s\n' "SELF_SERVICE_ENABLED=true" "SMTP_HOST=smtp.migadu.com" "SMTP_USER=a@b.test" "SMTP_PASSWORD=segredo-real" >> "$d/.env"
caso "cadastro público com SMTP real passa" 0 "Configuração válida" "$d" --check --no-prompt

d=$(novo_dir); env_valido "$d"; printf 'COMPOSE_PROFILES=duckdns\nDUCKDNS_TOKEN=t\nDUCKDNS_SUBDOMAIN=zelium\n' >> "$d/.env"
caso "profile duckdns é aceito" 0 "Configuração válida" "$d" --check --no-prompt

# --- fluxo completo com docker falso ----------------------------------------
FAKE=$(mktemp -d); LOG="$FAKE/chamadas.log"
cat > "$FAKE/docker" <<EOF
#!/usr/bin/env bash
echo "docker \$*" >> "$LOG"
case "\$*" in
  *"ps backend"*) echo healthy ;;
esac
exit 0
EOF
chmod +x "$FAKE/docker"

d=$(novo_dir)
saida=$(cd "$d" && PATH="$FAKE:$PATH" ./up.sh --no-prompt 2>&1); codigo=$?
TOTAL=$((TOTAL + 1))
jwt1=$(grep '^JWT_SECRET=' "$d/.env" | cut -d= -f2-)
if [ "$codigo" -eq 0 ] && [ "${#jwt1}" -ge 32 ] && ! grep -E '^(JWT_SECRET|POSTGRES_PASSWORD)=troque-' "$d/.env" >/dev/null \
   && [ "$(stat -c %a "$d/.env")" = 600 ] && grep -q 'up -d --build' "$LOG" \
   && grep -q 'Backend saudável' <<<"$saida"; then
  echo "✓ primeira execução cria .env (600) com segredos gerados e sobe"
else
  FALHAS=$((FALHAS + 1)); echo "✗ primeira execução (exit=$codigo)"; echo "$saida" | sed 's/^/    /'
fi

saida=$(cd "$d" && PATH="$FAKE:$PATH" ./up.sh --no-prompt 2>&1); codigo=$?
TOTAL=$((TOTAL + 1))
if [ "$codigo" -eq 0 ] && [ "$(grep '^JWT_SECRET=' "$d/.env" | cut -d= -f2-)" = "$jwt1" ]; then
  echo "✓ segunda execução não troca os segredos"
else
  FALHAS=$((FALHAS + 1)); echo "✗ segunda execução (exit=$codigo)"; echo "$saida" | sed 's/^/    /'
fi

# --- prompts (precisa de pty; pula se `script` não existir) ------------------
if command -v script >/dev/null 2>&1; then
  d=$(novo_dir)
  : > "$LOG"
  (cd "$d" && printf 'servidor.empresa.test\ngestor@empresa.test\n%s\n' 'Senha$Com$Dolar123' \
    | PATH="$FAKE:$PATH" script -qefc "./up.sh" /dev/null >/dev/null 2>&1)
  TOTAL=$((TOTAL + 1))
  if grep -q '^ZELAR_DOMAIN=servidor.empresa.test$' "$d/.env" \
     && grep -q '^BOOTSTRAP_GESTOR_EMAIL=gestor@empresa.test$' "$d/.env" \
     && grep -qF "BOOTSTRAP_GESTOR_SENHA='Senha\$Com\$Dolar123'" "$d/.env"; then
    echo "✓ prompts gravam domínio, e-mail e senha (com \$ entre aspas simples)"
  else
    FALHAS=$((FALHAS + 1)); echo "✗ prompts"; grep -E 'ZELAR_DOMAIN|BOOTSTRAP' "$d/.env" | sed 's/^/    /'
  fi
fi

echo; echo "$((TOTAL - FALHAS))/$TOTAL ok"
[ "$FALHAS" -eq 0 ]

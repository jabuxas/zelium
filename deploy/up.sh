#!/usr/bin/env bash
# Zelium — sobe (ou atualiza) a stack de produção em um comando.
#
#   ./up.sh            cria o .env se faltar, valida e roda o compose
#   ./up.sh --check    só valida o .env (não sobe nada)
#   ./up.sh --no-prompt  nunca pergunta (CI/automação): falha se faltar algo
#
# Seguro para repetir: não sobrescreve o que já está no .env.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

CHECK_ONLY=0
PROMPT=1
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    --no-prompt) PROMPT=0 ;;
    -h|--help) sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opção desconhecida: $arg (use --help)" >&2; exit 2 ;;
  esac
done
[ -t 0 ] || PROMPT=0

COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env)

erro() { echo "✗ $*" >&2; ERROS=$((ERROS + 1)); }
aviso() { echo "! $*" >&2; }
ERROS=0

# Lê KEY do .env (última ocorrência ativa), sem executar o arquivo.
get_var() {
  local linha
  linha=$(grep -E "^$1=" .env 2>/dev/null | tail -n 1 || true)
  linha=${linha#*=}
  linha=${linha%\"}; linha=${linha#\"}; linha=${linha%\'}; linha=${linha#\'}
  printf '%s' "$linha"
}

# Grava KEY=VALUE no .env: troca a linha ativa (ou, na falta, a comentada);
# sem nenhuma, acrescenta.
set_var() {
  local tmp padrao
  tmp=$(mktemp)
  if grep -qE "^$1=" .env; then padrao="^$1="; else padrao="^# ?$1="; fi
  KEY="$1" VAL="$2" PAD="$padrao" awk '
    BEGIN { k = ENVIRON["KEY"]; v = ENVIRON["VAL"]; p = ENVIRON["PAD"]; feito = 0 }
    $0 ~ p && !feito { print k "=" v; feito = 1; next }
    { print }
    END { if (!feito) print k "=" v }
  ' .env > "$tmp"
  cat "$tmp" > .env
  rm -f "$tmp"
}

precisa_valor() { # KEY — vazio ou ainda o texto de exemplo
  local v; v=$(get_var "$1")
  [ -z "$v" ] || [[ "$v" == troque-* ]]
}

# --- 1) pré-requisitos ------------------------------------------------------
command -v docker >/dev/null 2>&1 || { echo "Docker não encontrado. Instale o Docker Engine + plugin Compose." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Plugin 'docker compose' não encontrado." >&2; exit 1; }

# --- 2) .env: cria com segredos gerados -------------------------------------
if [ ! -f .env ]; then
  [ "$CHECK_ONLY" = 1 ] && { echo "✗ .env não existe. Rode ./up.sh (sem --check) para criá-lo." >&2; exit 1; }
  command -v openssl >/dev/null 2>&1 || { echo "openssl é necessário para gerar os segredos." >&2; exit 1; }
  cp .env.example .env
  chmod 600 .env
  set_var JWT_SECRET "$(openssl rand -base64 48 | tr -d '\n')"
  set_var POSTGRES_PASSWORD "$(openssl rand -hex 24)"
  echo "✓ .env criado com JWT_SECRET e POSTGRES_PASSWORD gerados."
fi

# --- 3) pergunta o essencial (só com terminal) ------------------------------
if [ "$PROMPT" = 1 ] && [ "$CHECK_ONLY" = 0 ]; then
  if [ "$(get_var ZELAR_DOMAIN)" = "zelium.duckdns.org" ] || [ -z "$(get_var ZELAR_DOMAIN)" ]; then
    read -r -p "Domínio público (ex.: zelium.suaempresa.com.br): " dominio
    [ -n "$dominio" ] && set_var ZELAR_DOMAIN "$dominio"
  fi
  if [ -z "$(get_var BOOTSTRAP_GESTOR_EMAIL)" ] && [ -z "$(get_var BOOTSTRAP_GESTOR_SENHA)" ]; then
    echo "Primeiro acesso: o Gestor inicial (deixe em branco se este servidor já tem usuários)."
    read -r -p "  E-mail do Gestor: " gestor_email
    if [ -n "$gestor_email" ]; then
      read -r -s -p "  Senha (12+ caracteres): " gestor_senha; echo
      if [[ "$gestor_senha" == *"'"* ]]; then
        echo "✗ A senha não pode conter aspas simples (') — edite o .env à mão." >&2; exit 1
      fi
      set_var BOOTSTRAP_GESTOR_EMAIL "$gestor_email"
      # Aspas simples: o compose não interpola '$' dentro delas.
      set_var BOOTSTRAP_GESTOR_SENHA "'$gestor_senha'"
    fi
  fi
fi

# --- 4) validação -----------------------------------------------------------
dominio=$(get_var ZELAR_DOMAIN)
[ -n "$dominio" ] || erro "ZELAR_DOMAIN vazio."
[[ "$dominio" == *://* || "$dominio" == */* ]] && erro "ZELAR_DOMAIN deve ser só o domínio (sem https:// nem /)."
[[ "$dominio" == *.* ]] || erro "ZELAR_DOMAIN ('$dominio') não parece um domínio."

precisa_valor POSTGRES_PASSWORD && erro "POSTGRES_PASSWORD não definido (ainda é o texto de exemplo)."
jwt=$(get_var JWT_SECRET)
{ [[ "$jwt" == troque-* ]] || [ "${#jwt}" -lt 32 ]; } && erro "JWT_SECRET ausente ou curto demais (mín. 32). Gere: openssl rand -base64 48"

b_email=$(get_var BOOTSTRAP_GESTOR_EMAIL); b_senha=$(get_var BOOTSTRAP_GESTOR_SENHA)
if [ -n "$b_email" ] || [ -n "$b_senha" ]; then
  [ -n "$b_email" ] || erro "BOOTSTRAP_GESTOR_SENHA definido sem BOOTSTRAP_GESTOR_EMAIL."
  [ -n "$b_senha" ] || erro "BOOTSTRAP_GESTOR_EMAIL definido sem BOOTSTRAP_GESTOR_SENHA."
  [ -z "$b_senha" ] || [ "${#b_senha}" -ge 12 ] || erro "BOOTSTRAP_GESTOR_SENHA precisa de 12+ caracteres."
elif [ "$(get_var PERMITIR_CONTAS_DEMO)" != "true" ]; then
  aviso "Sem BOOTSTRAP_GESTOR_*: em servidor NOVO o backend recusa subir (contas demo com senha pública). Em servidor com usuários reais, ignore."
fi

precisa_smtp=0
[ "$(get_var SELF_SERVICE_ENABLED)" = "true" ] && precisa_smtp=1
[ "$(get_var RECUPERACAO_SENHA_ENABLED)" = "true" ] && precisa_smtp=1
if [ "$precisa_smtp" = 1 ]; then
  smtp=$(get_var SMTP_HOST)
  { [ -z "$smtp" ] || [ "$smtp" = "smtp.exemplo.com" ] || precisa_valor SMTP_PASSWORD; } \
    && erro "Cadastro/recuperação ativos exigem SMTP real (SMTP_HOST/USER/PASSWORD)."
fi

if [ "$ERROS" -gt 0 ]; then
  echo "Corrija o .env ($(pwd)/.env) e rode de novo." >&2
  exit 1
fi
"${COMPOSE[@]}" config -q || { echo "✗ docker compose rejeitou a configuração." >&2; exit 1; }
echo "✓ Configuração válida (https://$dominio)."
[ "$CHECK_ONLY" = 1 ] && exit 0

# --- 5) sobe e espera o backend ---------------------------------------------
"${COMPOSE[@]}" up -d --build
echo -n "Aguardando o backend"
for _ in $(seq 1 60); do
  estado=$("${COMPOSE[@]}" ps backend --format '{{.Health}}' 2>/dev/null || true)
  [ "$estado" = "healthy" ] && { echo; echo "✓ Backend saudável."; break; }
  echo -n "."; sleep 3
done
if [ "${estado:-}" != "healthy" ]; then
  echo; echo "✗ Backend não ficou saudável em 3 min. Últimos logs:" >&2
  "${COMPOSE[@]}" logs --tail 20 backend >&2
  exit 1
fi

echo "✓ Pronto: https://$dominio (o HTTPS é emitido no primeiro acesso)."
echo "  Logs: docker compose -f docker-compose.prod.yml --env-file .env logs -f"

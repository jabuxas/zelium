# Zelium — Infraestrutura própria (produção)

Este documento descreve como colocar o **Zelium** em produção no **servidor da equipe**,
com **HTTPS automático (SSL)**, **backup automatizado** e **retenção diária**. O domínio pode ser
próprio ou DuckDNS (opcional).

> A stack de produção vive em [`deploy/`](../deploy): `docker-compose.prod.yml`,
> `Caddyfile`, `backup.sh`, `restore.sh` e `.env.example`.

---

## 1. Arquitetura de produção

```
Internet
   │  https://seu-dominio
   ▼
Caddy (HTTPS automático via Let's Encrypt)
   ├── /api/*      ──► backend  (Node/Express :8000)
   ├── /uploads/*  ──► backend  (fotos enviadas)
   └── /*          ──► frontend (Next.js :3000)
                          │
backend ──────────────► db (PostgreSQL 17, sem porta pública)
                          ▲
backup (cron 02:00) ─────┘  pg_dump diário + retenção de 14 dias
retencao (24h) ───────────┘  apaga pendências expiradas e notificações antigas
duckdns (opcional) ───── atualiza o IP público de um domínio DuckDNS
```

Decisões importantes:

- **O banco não expõe porta** para o host — só a rede interna do Docker o acessa.
- **Caddy** emite e renova o certificado SSL sozinho (zero configuração manual).
- **Backups** rodam dentro da própria stack (serviço `backup`), gravados no volume
  `backups_data`, com rotação automática (padrão: 14 dias).

---

## 2. Pré-requisitos no servidor

- Linux com **Docker Engine + Compose plugin** instalados.
- Portas **80** e **443** liberadas no firewall (e no roteador, encaminhadas ao servidor).
- Um **domínio** apontando (DNS tipo A) para o IP do servidor — próprio
  (`zelium.suaempresa.com.br`) ou DuckDNS (veja a seção 4).

---

## 3. Passo a passo

### 3.1 Início rápido (recomendado): `./up.sh`

```bash
git clone <repositório> zelium && cd zelium/deploy
./up.sh
```

O script:

1. cria o `.env` (permissão 600) com `JWT_SECRET` e `POSTGRES_PASSWORD`
   **gerados**;
2. pergunta o **domínio** e o **e-mail/senha do primeiro Gestor** (se houver
   terminal);
3. valida o `.env` (bootstrap, SMTP quando cadastro/recuperação estão ligados,
   formato do domínio) e o compose;
4. sobe a stack e espera o backend ficar saudável.

Seguro para repetir (não troca segredos já gerados). Também serve para
atualizar. `./up.sh --check` só valida; `./up.sh --no-prompt` nunca pergunta
(automação). `./up.test.sh` testa o próprio script sem subir nada.

### 3.2 Primeira subida: o Gestor inicial (`BOOTSTRAP_*`)

O banco novo vem com 3 contas demo (`gestor/responsavel/conferente@zelium.com`,
senha **pública** `Zelium@2026`). Em produção o backend **recusa subir** com
elas ativas. Para não precisar de SQL, defina no `.env`:

```env
BOOTSTRAP_GESTOR_EMAIL=voce@suaempresa.com.br
BOOTSTRAP_GESTOR_SENHA=uma-senha-longa-de-12-ou-mais     # não pode conter aspas simples
# opcionais:
# BOOTSTRAP_GESTOR_NOME=Seu Nome
# BOOTSTRAP_ORGANIZACAO_NOME=Sua Empresa
```

Na primeira subida o backend cria a **organização** (sem prazo nem limites de
trial — é a sua), o **Gestor** e os **estados iniciais**, e **desativa as
contas demo** que ainda têm a senha padrão. Depois é idempotente: manter as
variáveis no `.env` é seguro e a senha de um e-mail que já existe **nunca** é
sobrescrita (use “esqueci minha senha”).

> A organização de demonstração do seed (#1, “IFSC Campus São José”, com bens
> de exemplo) continua no banco, mas sem nenhum usuário ativo — fica invisível
> e inerte. Quem opera o piloto IFSC **não** define `BOOTSTRAP_*`.

Alternativa de transição (não recomendada): `PERMITIR_CONTAS_DEMO=true` sobe
com as contas demo ativas e avisa nos logs.

### 3.3 Variáveis do `.env`

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `ZELAR_DOMAIN` | sim | Só o domínio (sem `https://`). O Caddy emite o HTTPS. |
| `POSTGRES_PASSWORD`, `JWT_SECRET` | sim | Gerados pelo `up.sh`. |
| `BOOTSTRAP_GESTOR_EMAIL` / `_SENHA` | servidor novo | Gestor inicial (seção 3.2). |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM` | p/ e-mail | Notificações, cadastro e recuperação. Migadu homologado: porta 465. |
| `SELF_SERVICE_ENABLED` | não (false) | Abre o cadastro público (trial de 30 dias). Exige SMTP. |
| `RECUPERACAO_SENHA_ENABLED` | não (false) | “Esqueci minha senha”. Exige SMTP. |
| `COMPOSE_PROFILES=duckdns` + `DUCKDNS_*` | não | Atualização de IP DuckDNS (seção 4). |
| `NOTIFICACAO_RETENCAO_DIAS` / `AUDITORIA_RETENCAO_DIAS` | não (180 / 0) | Retenção diária; 0 = manter. |
| `BACKUP_RETENTION_DAYS` | não (14) | Rotação dos dumps. |
| `JWT_EXPIRES_IN`, `RATE_LIMIT_LOGIN_MAX`, `TRUST_PROXY`, `WEB_ORIGINS` | não | Ajustes finos; os padrões servem à stack padrão. |

As URLs de confirmação de cadastro e de recuperação são derivadas de
`ZELAR_DOMAIN` (`/cadastro/confirmar` e `/recuperar-senha/redefinir`).

### 3.4 Subir manualmente (sem o `up.sh`)

```bash
cd deploy
cp .env.example .env && nano .env
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Na primeira subida:

1. O PostgreSQL cria o schema e o seed (scripts de `src/db/`).
2. O backend executa as migrações, o bootstrap do Gestor e sobe em `:8000`.
3. O frontend é compilado com `NEXT_PUBLIC_API_URL=/api` (mesma origem, sem CORS).
4. O Caddy emite o certificado SSL para o domínio em poucos segundos.
5. O serviço `retencao` roda a primeira limpeza e repete a cada 24h.

Acompanhe os logs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env logs -f backend caddy
```

### 3.5 Verificar

```bash
curl https://seu-dominio/health        # {"status":"ok"}
curl -I https://seu-dominio/           # HTTP/2 200, certificado válido
```

---

## 4. DuckDNS (opcional)

Só para quem usa um domínio DuckDNS com IP dinâmico. Com domínio próprio,
ignore esta seção. No `.env`:

```env
COMPOSE_PROFILES=duckdns
DUCKDNS_TOKEN=seu-token
DUCKDNS_SUBDOMAIN=zelium        # só o nome: zelium.duckdns.org -> zelium
```

O serviço `duckdns` passa a atualizar o registro DNS sempre que o IP público
mudar. Sem o profile, o serviço não sobe e o token não é exigido.

Se preferir atualizar fora do Docker, equivalente manual:

```bash
echo url="https://www.duckdns.org/update?domains=zelium&token=SEU_TOKEN&ip=" | curl -k -K -
```

---

## 5. SSL (HTTPS)

O Caddy usa **ACME (Let's Encrypt)** por padrão. O certificado é emitido no primeiro
acesso e **renovado automaticamente** (Caddy cuida disso em background).

- Certificados e contas ficam persistidos no volume `caddy_data`.
- Domínios DuckDNS são cobertos pelo rate limit público do Let's Encrypt; evite
  recriar o volume `caddy_data` desnecessariamente.

---

## 6. Backup e restauração

### Automático

O serviço `backup` agenda via cron um `pg_dump` diário às **02:00 UTC** (`deploy/backup.sh`),
comprimido em gzip e com retenção rotativa de `BACKUP_RETENTION_DAYS` (padrão 14).

Logs: `docker compose -f docker-compose.prod.yml exec backup cat /backups/backup.log`

### Manual

```bash
docker compose -f docker-compose.prod.yml exec backup /backup.sh
```

### Restaurar

```bash
cd deploy
./restore.sh backups/zelium_2026-10-22_02-00-00.sql.gz
```

### Backup fora do servidor (recomendado)

Copie o volume periodicamente para outro local (ex.: outro servidor, NAS ou bucket S3):

```bash
docker run --rm -v zelium_backups_data:/backups -v "$PWD":/saida alpine \
  sh -c 'cp /backups/zelium_*.sql.gz /saida/'
# envie /saida para o destino remoto (rsync, rclone, s3cmd...)
```

---

## 7. Migrando do Render (atual produção)

O deploy atual usa o Render (`render.yaml`). Para migrar sem perder dados:

1. No Render, gere um dump:
   `pg_dump $DATABASE_URL | gzip > zelium_migracao.sql.gz`
2. Suba a stack no servidor (passo 3), **deixe o banco inicializar** e então:
   `./restore.sh` usando o arquivo da migração.
3. Aponte o domínio para o IP do servidor (DuckDNS automático com o profile `duckdns`).
4. Valide os fluxos principais e desligue o serviço no Render.

---

## 8. Atualizações (deploy contínuo)

```bash
cd deploy
git pull
./up.sh        # ou: docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

As migrações de banco são executadas automaticamente na subida do backend
(`src/backend/src/database/migrate.ts`) — não há passo manual de schema.

Desde 29/10/2026, a inicialização usa transação e lock de migração, e alterações
novas são registradas em `schema_migrations`. A unicidade patrimonial passa a ser
por organização. **Ensaiar em cópia restaurável e reservar janela curta sem
escrita antes de atualizar**: o DDL pode bloquear tabelas. Consulte
[`MIGRACOES.md`](MIGRACOES.md) para preservação de dados e reversão segura.

---

## 9. Operação

| Ação | Comando |
| --- | --- |
| Status da stack | `docker compose -f docker-compose.prod.yml ps` |
| Logs | `docker compose -f docker-compose.prod.yml logs -f` |
| Reiniciar tudo | `docker compose -f docker-compose.prod.yml restart` |
| Backup manual | `docker compose -f docker-compose.prod.yml exec backup /backup.sh` |
| Restaurar backup | `./restore.sh backups/<arquivo>.sql.gz` |

**Boas práticas**

- Defina `BOOTSTRAP_GESTOR_*` na primeira subida (seção 3.2). A aplicação
  **recusa subir em produção** com as contas demo
  (`gestor/responsavel/conferente@zelium.com`) na senha padrão;
  `PERMITIR_CONTAS_DEMO=true` é transição consciente e fica avisando.
- **Retenção operacional:** automática. O serviço `retencao` roda
  `limparRetencao.js` ao subir e a cada 24h: apaga pendências expiradas
  (cadastro/senha), notificações acima de `NOTIFICACAO_RETENCAO_DIAS` (padrão
  180) e auditoria acima de `AUDITORIA_RETENCAO_DIAS` (padrão 0 = manter tudo —
  é o rastro de responsabilidade; purgar é decisão explícita). Conferir:
  `docker compose -f docker-compose.prod.yml logs retencao` (só contagens).
- Monitore o disco (`backups_data` e `db_data` crescem com o tempo).
- Confira o certificado com `curl -vI https://<domínio>/` após a primeira subida.

O backend também **recusa subir em produção sem `JWT_SECRET`** ou com o segredo
de desenvolvimento (fail fast no import). Sessões são revogáveis: trocar a
senha de um usuário desativa os tokens dele na hora (ADR-0011).

A sessão da web usa **cookie HttpOnly** (`zelium_sessao`, `SameSite=Lax`,
`Secure` em produção) e a API aplica defesa CSRF em escritas por cookie
(ADR-0014). O Caddy serve tudo no mesmo domínio (`/api` no próprio site), então
**não é preciso definir `WEB_ORIGINS`** — a allowlist CORS nasce vazia em
produção. Defina `WEB_ORIGINS` (separada por vírgula) apenas se algum dia a
web for servida em origem diferente da API. Usuários com sessão antiga (token
no navegador) fazem login novamente uma única vez.

# Zelium — Infraestrutura própria (produção)

Este documento descreve como colocar o **Zelium** em produção no **servidor da equipe**,
com DNS via **DuckDNS**, **HTTPS automático (SSL)** e **backup automatizado**.

> A stack de produção vive em [`deploy/`](../deploy): `docker-compose.prod.yml`,
> `Caddyfile`, `backup.sh`, `restore.sh` e `.env.example`.

---

## 1. Arquitetura de produção

```
Internet
   │  https://zelium.duckdns.org
   ▼
Caddy (HTTPS automático via Let's Encrypt)
   ├── /api/*      ──► backend  (Node/Express :8000)
   ├── /uploads/*  ──► backend  (fotos enviadas)
   └── /*          ──► frontend (Next.js :3000)
                          │
backend ──────────────► db (PostgreSQL 17, sem porta pública)
                          ▲
backup (cron 02:00) ─────┘  pg_dump diário + retenção de 14 dias
duckdns (cron 5 min) ── atualiza o IP público do domínio
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
- Domínio criado em **https://www.duckdns.org** (ex.: `zelium.duckdns.org`), com o
  **token** da conta anotado.

---

## 3. Passo a passo

### 3.1 Configurar variáveis

```bash
cd deploy
cp .env.example .env
nano .env   # preencha ZELAR_DOMAIN, DUCKDNS_TOKEN, senhas, JWT_SECRET e SMTP
```

Gerar um segredo JWT forte:

```bash
openssl rand -base64 48
```

### 3.2 Subir a stack

```bash
cd deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Na primeira subida:

1. O PostgreSQL cria o schema e o seed (scripts de `src/db/`).
2. O backend executa as migrações automáticas e sobe em `:8000`.
3. O frontend é compilado com `NEXT_PUBLIC_API_URL=/api` (mesma origem, sem CORS).
4. O Caddy emite o certificado SSL para o domínio DuckDNS em poucos segundos.

Acompanhe os logs:

```bash
docker compose -f docker-compose.prod.yml logs -f backend caddy
```

### 3.3 Verificar

```bash
curl https://zelium.duckdns.org/health        # {"status":"ok"}
curl -I https://zelium.duckdns.org/           # HTTP/2 200, certificado válido
```

---

## 4. DuckDNS (DNS dinâmico)

O serviço `duckdns` da stack atualiza o registro DNS sempre que o IP público mudar
(cron a cada 5 min). Nada a fazer além de informar `DUCKDNS_TOKEN` e o subdomínio
(extraído automaticamente de `ZELAR_DOMAIN`).

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
3. Aponte o domínio DuckDNS para o IP do servidor (automático via serviço `duckdns`).
4. Valide os fluxos principais e desligue o serviço no Render.

---

## 8. Atualizações (deploy contínuo)

```bash
cd deploy
git pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
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

- Troque as senhas padrão e o `JWT_SECRET` antes do primeiro acesso público.
- Monitore o disco (`backups_data` e `db_data` crescem com o tempo).
- Confira o certificado com `curl -vI https://<domínio>/` após a primeira subida.

O backend também **recusa subir em produção sem `JWT_SECRET`** ou com o segredo
de desenvolvimento (fail fast no import). Sessões são revogáveis: trocar a
senha de um usuário desativa os tokens dele na hora (ADR-0011).

#!/bin/sh
# Zelium — Backup automatizado do PostgreSQL
# Executado diariamente pelo serviço `backup` (cron) do docker-compose.prod.yml.
#
# Comportamento:
#   - Gera dump comprimido com data/hora no nome
#   - Mantém apenas os últimos BACKUP_RETENTION_DAYS arquivos
#   - Também pode ser executado manualmente: docker compose exec backup /backup.sh

set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
OUTPUT="${BACKUP_DIR}/zelium_${TIMESTAMP}.sql.gz"

echo "[$(date -Iseconds)] Iniciando backup: ${OUTPUT}"

pg_dump --no-owner --no-privileges --clean --if-exists | gzip > "${OUTPUT}"

echo "[$(date -Iseconds)] Backup concluído (${OUTPUT})"

# Rotação: remove backups mais antigos que a retenção configurada
find "${BACKUP_DIR}" -name 'zelium_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date -Iseconds)] Backups atuais:"
ls -lh "${BACKUP_DIR}"/zelium_*.sql.gz 2>/dev/null || echo "  (nenhum)"

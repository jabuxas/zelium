#!/bin/sh
# Zelium — Restauração de backup do PostgreSQL
#
# Uso (a partir do diretório deploy/, com a stack rodando):
#   ./restore.sh backups/zelium_2026-10-22_02-00-00.sql.gz
#
# A restauração usa o mesmo volume de backups do serviço `backup`;
# basta informar o caminho do arquivo dentro do container.

set -eu

if [ -z "${1:-}" ]; then
  echo "Uso: $0 <arquivo.sql.gz>"
  echo "Exemplo: $0 backups/zelium_2026-10-22_02-00-00.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
shift

if ! docker compose -f docker-compose.prod.yml ps --status running | grep -q "backup"; then
  echo "O serviço 'backup' precisa estar rodando (docker compose -f docker-compose.prod.yml up -d backup)"
  exit 1
fi

echo "Restaurando ${BACKUP_FILE} no banco de produção..."
docker compose -f docker-compose.prod.yml exec -T backup sh -c \
  "gunzip -c '${BACKUP_FILE}' | psql"

echo "Restauração concluída."

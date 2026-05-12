#!/bin/sh
# Load .env file into the process environment before starting Next.js
set -a
[ -f /app/.env ] && . /app/.env
set +a
exec node /app/server.js "$@"

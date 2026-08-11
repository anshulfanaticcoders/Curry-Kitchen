#!/bin/sh
set -e

# Apply pending schema migrations before serving traffic. Set SKIP_MIGRATIONS=1
# to boot without touching the database (e.g. when scaling extra replicas).
if [ "$SKIP_MIGRATIONS" != "1" ]; then
  npx prisma migrate deploy
fi

exec node server.js

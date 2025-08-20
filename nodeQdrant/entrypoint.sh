#!/bin/sh
set -e

echo "⏳ Waiting for postgres at $PGHOST:$PGPORT..."

until nc -z "$PGHOST" "$PGPORT"; do
  sleep 1
done

echo "✅ Postgres is up, running migrations..."
npm run migrate down
npm run migrate up

echo "🚀 Starting server..."
npm run start

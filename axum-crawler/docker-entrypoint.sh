#!/bin/sh
set -e

echo "⏳ Waiting for Postgres at $PGHOST:$PGPORT..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"; do
  sleep 1
done
echo "✅ Postgres is ready"

echo "⏳ Waiting for Qdrant at $QDRANT_URL..."
Q_HOST=$(echo $QDRANT_URL | awk -F[/:] '{print $4}')
Q_PORT=$(echo $QDRANT_URL | awk -F[/:] '{print $5}')
until nc -z "$Q_HOST" "$Q_PORT"; do sleep 1; done
echo "✅ Qdrant is up"

echo "⏳ Waiting for Ollama at $OLLAMA_URL..."
O_HOST=$(echo $OLLAMA_URL | awk -F[/:] '{print $4}')
O_PORT=$(echo $OLLAMA_URL | awk -F[/:] '{print $5}')
until nc -z "$O_HOST" "$O_PORT"; do sleep 1; done
echo "✅ Ollama is up"

if [ "$1" = "dev" ]; then
    echo "🚀 Starting Rust server in DEVELOPMENT mode with live reload..."
    exec cargo watch -x run
else
    echo "🚀 Starting Rust server in PRODUCTION mode..."
    exec /app/target/release/axum-crawler
fi
#!/bin/sh
set -e

# Wait for Postgres to accept SQL connections
echo "⏳ Waiting for Postgres at $PGHOST:$PGPORT..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"; do
  sleep 1
done
echo "✅ Postgres is ready"

# Wait for Qdrant
echo "⏳ Waiting for Qdrant at $QDRANT_URL..."
Q_HOST=$(echo $QDRANT_URL | awk -F[/:] '{print $4}')
Q_PORT=$(echo $QDRANT_URL | awk -F[/:] '{print $5}')
until nc -z "$Q_HOST" "$Q_PORT"; do sleep 1; done
echo "✅ Qdrant is up"

# Wait for Ollama (optional)
echo "⏳ Waiting for Ollama at $OLLAMA_URL..."
O_HOST=$(echo $OLLAMA_URL | awk -F[/:] '{print $4}')
O_PORT=$(echo $OLLAMA_URL | awk -F[/:] '{print $5}')
until nc -z "$O_HOST" "$O_PORT"; do sleep 1; done
echo "✅ Ollama is up"

# Run the prebuilt release binary
echo "🚀 Starting Rust server..."
exec /app/target/release/axum-crawler

#!/bin/bash
# kill_ports.sh

PORTS=(3000 4000 8000 6333 11434 11435 5432)

echo "🔍 Checking for processes using ports: ${PORTS[@]}"

for port in "${PORTS[@]}"; do
  while true; do
    pid=$(lsof -t -i:$port 2>/dev/null)
    if [ -n "$pid" ]; then
      echo "⚠️ Port $port is in use by PID $pid. Killing..."
      kill -9 $pid
      sleep 1
    else
      echo "✅ Port $port is free."
      break
    fi
  done
done

echo "🚀 All blocking processes killed. Now you can run: docker compose up"

#!/bin/sh
set -e

echo "=== Accounting Agent ==="
echo "Dashboard : http://0.0.0.0:${NEXT_PORT:-3002}"
echo "Webhook   : http://0.0.0.0:${WEBHOOK_PORT:-3001}/webhook"
echo "Inbox     : $(pwd)/inbox"
echo ""

# Start Next.js dashboard in the background
node node_modules/.bin/next start --port "${NEXT_PORT:-3002}" &

# Run the compiled agent as PID 1 so Docker stop signals land here.
# The agent's SIGINT handler closes the DB and watcher cleanly.
exec node dist/index.js

#!/usr/bin/env bash
# Accounting Agent — Docker deploy
# Usage: ./deploy.sh [--build-only] [--logs]
#   --build-only  build image without starting container
#   --logs        tail container logs after start

set -euo pipefail

IMAGE="accounting-agent"
CONTAINER="accounting-agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BUILD_ONLY=0
TAIL_LOGS=0
for arg in "$@"; do
  case "$arg" in
    --build-only) BUILD_ONLY=1 ;;
    --logs)       TAIL_LOGS=1  ;;
  esac
done

# ── Preflight ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "Docker not found — install from https://docs.docker.com/get-docker/"
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "Error: .env not found."
  echo "Copy .env.example, fill in GEMINI_API_KEY, then re-run."
  exit 1
fi

# ── Read config from .env (for port display only) ────────────────────────────
WEBHOOK_PORT=$(grep -E '^WEBHOOK_PORT=' "$SCRIPT_DIR/.env" | cut -d= -f2 | tr -d ' ' || echo "3001")
WEBHOOK_PORT="${WEBHOOK_PORT:-3001}"
NEXT_PORT="${NEXT_PORT:-3002}"

# ── Host volume directories ───────────────────────────────────────────────────
HOST_INBOX="$SCRIPT_DIR/inbox"
HOST_OUTPUT="$SCRIPT_DIR/output"
HOST_DATA="$SCRIPT_DIR/data"
HOST_LOGS="$SCRIPT_DIR/logs"
HOST_SAMPLES="$SCRIPT_DIR/tests/samples"

mkdir -p \
  "$HOST_INBOX/processed" \
  "$HOST_INBOX/duplicates" \
  "$HOST_OUTPUT" \
  "$HOST_DATA" \
  "$HOST_LOGS" \
  "$HOST_SAMPLES"

# ── Build ─────────────────────────────────────────────────────────────────────
echo "Building image: $IMAGE"
docker build -t "$IMAGE" "$SCRIPT_DIR"
echo ""

[ "$BUILD_ONLY" -eq 1 ] && echo "Build complete." && exit 0

# ── Stop existing container ───────────────────────────────────────────────────
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Stopping existing container..."
  docker rm -f "$CONTAINER" >/dev/null
fi

# ── Run ───────────────────────────────────────────────────────────────────────
echo "Starting container: $CONTAINER"
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -p "${WEBHOOK_PORT}:${WEBHOOK_PORT}" \
  -p "${NEXT_PORT}:${NEXT_PORT}" \
  -v "$HOST_DATA:/app/data" \
  -v "$HOST_INBOX:/app/inbox" \
  -v "$HOST_OUTPUT:/app/output" \
  -v "$HOST_LOGS:/app/logs" \
  -v "$HOST_SAMPLES:/app/tests/samples" \
  --env-file "$SCRIPT_DIR/.env" \
  "$IMAGE" >/dev/null

echo ""
echo "✓ Running"
echo ""
echo "  Dashboard  →  http://localhost:${NEXT_PORT}"
echo "  Webhook    →  http://localhost:${WEBHOOK_PORT}/webhook"
echo "  Health     →  http://localhost:${WEBHOOK_PORT}/health"
echo ""
echo "  Drop PDFs into: $HOST_INBOX"
echo ""
echo "  docker logs -f $CONTAINER     # live logs"
echo "  docker stop $CONTAINER        # stop"
echo "  docker restart $CONTAINER     # restart"
echo ""

[ "$TAIL_LOGS" -eq 1 ] && exec docker logs -f "$CONTAINER"

#!/usr/bin/env bash
# Simulates incoming file uploads to the /webhook endpoint.
# Usage:
#   ./webhook-test.sh                        # run all tests
#   ./webhook-test.sh <path/to/file.pdf>     # upload a specific PDF

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_PDF=""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; }
info() { echo -e "${CYAN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

# Read port from .env if WEBHOOK_HOST not explicitly set
_PORT=$(grep '^WEBHOOK_PORT' "${SCRIPT_DIR}/.env" 2>/dev/null | cut -d'=' -f2 | tr -d ' ')
_PORT="${_PORT:-3001}"
HOST="${WEBHOOK_HOST:-http://localhost:${_PORT}}"
SECRET="${WEBHOOK_SECRET:-$(grep '^WEBHOOK_SECRET' "${SCRIPT_DIR}/.env" 2>/dev/null | cut -d'=' -f2 | tr -d ' ')}"

auth_args() {
  if [ -n "$SECRET" ]; then
    echo "-H" "x-webhook-secret: ${SECRET}"
  fi
}

# Extract HTTP body (all lines except last) — macOS-compatible
response_body() { awk 'NR>1{print prev} {prev=$0}' <<< "$1"; }
response_code() { echo "$1" | tail -1; }

# Generate a test PDF via pdfkit
make_test_pdf() {
  local out="$1"
  node -e "
const PDFDocument = require('${SCRIPT_DIR}/node_modules/pdfkit');
const fs = require('fs');
const doc = new PDFDocument({ margin: 50, font: 'Courier' });
doc.pipe(fs.createWriteStream('${out}'));
doc.fontSize(16).text('TEST INVOICE');
doc.fontSize(11)
  .text('Invoice Number: TEST-WEBHOOK-001')
  .text('Issue Date: $(date +%Y-%m-%d)')
  .text('FROM: Webhook Test Corp')
  .text('Tax ID: 999999999')
  .text('TO: Test Client Ltd.')
  .text('ITEM: Webhook Test Service  500.00 ILS')
  .text('TOTAL DUE: 585.00 ILS');
doc.end();
doc.on('finish', () => process.exit(0));
" 2>/dev/null
}

echo ""
echo "=================================="
echo "  Webhook Integration Test"
echo "  Target: ${HOST}"
echo "=================================="
echo ""

# ── Test 1: Health check ───────────────────────────────────────────────────────
info "Test 1: GET /health"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${HOST}/health")
if [ "$HEALTH" = "200" ]; then
  pass "Health check returned 200"
  curl -s "${HOST}/health" | python3 -m json.tool 2>/dev/null || curl -s "${HOST}/health"
else
  fail "Health check returned ${HEALTH} — is the server running? (npm run dev)"
  exit 1
fi
echo ""

# ── Test 2: Upload PDF ─────────────────────────────────────────────────────────
UPLOAD_FILE="${1:-}"
if [ -n "$UPLOAD_FILE" ]; then
  [ ! -f "$UPLOAD_FILE" ] && { fail "File not found: $UPLOAD_FILE"; exit 1; }
  info "Test 2: POST /webhook — uploading $UPLOAD_FILE"
else
  TMP_PDF="${SCRIPT_DIR}/inbox/webhook_test_$(date +%s).pdf"
  info "Test 2: POST /webhook — generating + uploading test PDF"
  make_test_pdf "$TMP_PDF"
  UPLOAD_FILE="$TMP_PDF"
fi

RESPONSE=$(curl -s -w "\n%{http_code}" \
  $(auth_args) \
  -H "x-source: webhook-test-script" \
  -F "file=@${UPLOAD_FILE}" \
  "${HOST}/webhook")

HTTP_CODE=$(response_code "$RESPONSE")
BODY=$(response_body "$RESPONSE")

if [ "$HTTP_CODE" = "202" ]; then
  pass "File accepted (202)"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  fail "Unexpected status: ${HTTP_CODE}"
  echo "$BODY"
fi
echo ""

# ── Test 3: Reject non-PDF ────────────────────────────────────────────────────
info "Test 3: POST /webhook — reject non-PDF file"
TMP_TXT=$(mktemp /tmp/test_XXXXXX.txt)
echo "not a pdf" > "$TMP_TXT"

REJECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  $(auth_args) \
  -F "file=@${TMP_TXT}" \
  "${HOST}/webhook")
rm -f "$TMP_TXT"

if [ "$REJECT_CODE" = "400" ]; then
  pass "Non-PDF correctly rejected (400)"
else
  fail "Expected 400, got ${REJECT_CODE}"
fi
echo ""

# ── Test 4: Missing file field ────────────────────────────────────────────────
info "Test 4: POST /webhook — missing file field"
MISSING_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  $(auth_args) \
  -X POST \
  "${HOST}/webhook")

if [ "$MISSING_CODE" = "400" ]; then
  pass "Missing file correctly rejected (400)"
else
  fail "Expected 400, got ${MISSING_CODE}"
fi
echo ""

# ── Test 5: Auth check (only if secret set) ───────────────────────────────────
if [ -n "$SECRET" ]; then
  info "Test 5: POST /webhook — wrong secret rejected"
  AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "x-webhook-secret: wrong_secret" \
    -F "file=@${UPLOAD_FILE}" \
    "${HOST}/webhook")
  if [ "$AUTH_CODE" = "401" ]; then
    pass "Wrong secret correctly rejected (401)"
  else
    fail "Expected 401, got ${AUTH_CODE}"
  fi
  echo ""
else
  warn "Test 5: Skipped — WEBHOOK_SECRET not set (auth disabled)"
  echo ""
fi

echo "=================================="
echo "  Done. Check inbox/ for uploaded files."
echo "  The fileWatcher picks them up automatically."
echo "=================================="
echo ""

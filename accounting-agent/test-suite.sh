#!/usr/bin/env bash
# Accounting Agent — Test Suite
# Usage: ./test-suite.sh [--clean] [filter]
#   --clean   wipe tests/output/ and tests/test.db before running
#   filter    only run PDFs whose filename contains this string
#
# Place test PDFs in tests/samples/ then run this script.
# Uses an isolated DB and output dir so production data is never touched.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAMPLES_DIR="$SCRIPT_DIR/tests/samples"
TEMP_DIR="$SCRIPT_DIR/tests/.tmp"
LOG_DIR="$SCRIPT_DIR/tests/logs"
TEST_OUTPUT_DIR="$SCRIPT_DIR/tests/output"
TEST_DB="$SCRIPT_DIR/tests/test.db"

# ── Parse args ────────────────────────────────────────────────────────────────
CLEAN=0
FILTER=""
for arg in "$@"; do
  if [ "$arg" = "--clean" ]; then
    CLEAN=1
  else
    FILTER="$arg"
  fi
done

# ── Colors (only if stdout is a terminal) ─────────────────────────────────────
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; CYAN=''; BOLD=''; DIM=''; RESET=''
fi

# ── Preflight checks ──────────────────────────────────────────────────────────
if ! command -v npx &>/dev/null; then
  echo "npx not found — install Node.js"
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/package.json" ]; then
  echo "Run from accounting-agent/ directory"
  exit 1
fi

if [ ! -d "$SAMPLES_DIR" ]; then
  echo -e "${YELLOW}tests/samples/ not found${RESET}"
  echo "Create the directory and add test PDFs:"
  echo "  mkdir -p tests/samples && cp path/to/invoice.pdf tests/samples/"
  exit 1
fi

# ── Collect PDFs ──────────────────────────────────────────────────────────────
shopt -s nullglob
ALL_PDFS=("$SAMPLES_DIR"/*.pdf)

if [ ${#ALL_PDFS[@]} -eq 0 ]; then
  echo -e "${YELLOW}No PDFs in tests/samples/${RESET} — add test invoices/bank statements to run the suite"
  exit 1
fi

# Apply filter
PDFS=()
for f in "${ALL_PDFS[@]}"; do
  if [ -z "$FILTER" ] || [[ "$(basename "$f")" == *"$FILTER"* ]]; then
    PDFS+=("$f")
  fi
done

if [ ${#PDFS[@]} -eq 0 ]; then
  echo -e "${YELLOW}No PDFs match filter '${FILTER}'${RESET}"
  exit 1
fi

# ── Setup ─────────────────────────────────────────────────────────────────────
if [ "$CLEAN" -eq 1 ]; then
  echo -e "${DIM}Cleaning previous test artifacts...${RESET}"
  rm -rf "$TEST_OUTPUT_DIR" "$TEST_DB" "$LOG_DIR"
fi

mkdir -p "$TEMP_DIR" "$LOG_DIR" "$TEST_OUTPUT_DIR"
trap 'rm -rf "$TEMP_DIR"' EXIT

# ── Header ────────────────────────────────────────────────────────────────────
TOTAL=${#PDFS[@]}
echo ""
echo -e "${BOLD}Accounting Agent — Test Suite${RESET}"
echo -e "${DIM}Samples : $SAMPLES_DIR${RESET}"
echo -e "${DIM}Test DB : $TEST_DB${RESET}"
[ -n "$FILTER" ] && echo -e "${DIM}Filter  : $FILTER${RESET}"
echo -e "${DIM}Running $TOTAL PDF(s)...${RESET}"
echo ""

SEP="──────────────────────────────────────────────────────────────────────────"
echo -e "$SEP"

# ── Run tests ─────────────────────────────────────────────────────────────────
PASS=0
FAIL=0
IDX=0
declare -a FAIL_NAMES=()

for PDF in "${PDFS[@]}"; do
  IDX=$((IDX + 1))
  NAME="$(basename "$PDF")"
  STAMP="$(date +%Y%m%d_%H%M%S)"
  TEMP_COPY="$TEMP_DIR/${STAMP}_${NAME}"
  LOG_FILE="$LOG_DIR/${NAME%.pdf}_${STAMP}.log"

  cp "$PDF" "$TEMP_COPY"

  START=$(date +%s)

  # Run agent with isolated DB and output dirs.
  # OUTPUT_FORMAT unchanged — tests the real exporter pipeline.
  OUTPUT=$(
    cd "$SCRIPT_DIR"
    DB_PATH="$TEST_DB" \
    OUTPUT_DIR="$TEST_OUTPUT_DIR" \
    CSV_DIR="$TEST_OUTPUT_DIR/csv" \
    JSON_DIR="$TEST_OUTPUT_DIR/json" \
    XML_DIR="$TEST_OUTPUT_DIR/xml" \
    npx ts-node --project tsconfig.server.json src/index.ts --file "$TEMP_COPY" 2>&1
  ) || true

  END=$(date +%s)
  ELAPSED=$((END - START))

  # Persist log (strip ANSI codes for readability)
  printf '%s' "$OUTPUT" | sed $'s/\033\\[[0-9;]*m//g' > "$LOG_FILE"

  # ── Classify result ─────────────────────────────────────────────────────────
  STATUS="FAIL"
  TYPE="—"
  DETAIL="unknown error"

  if echo "$OUTPUT" | grep -q "Duplicate invoice detected"; then
    STATUS="PASS"
    TYPE="invoice"
    DETAIL="duplicate — skipped (expected)"

  elif echo "$OUTPUT" | grep -q "Done in"; then
    STATUS="PASS"
    if echo "$OUTPUT" | grep -q "Invoice:"; then
      TYPE="invoice"
      # Extract "Invoice: Issuer | INV-001 | 1234.56 ILS"
      DETAIL=$(echo "$OUTPUT" | grep "Invoice:" | tail -1 \
        | sed $'s/\033\\[[0-9;]*m//g' \
        | sed 's/.*Invoice: //')
    elif echo "$OUTPUT" | grep -q "Statement:"; then
      TYPE="bank_stmt"
      DETAIL=$(echo "$OUTPUT" | grep "Statement:" | tail -1 \
        | sed $'s/\033\\[[0-9;]*m//g' \
        | sed 's/.*Statement: //')
    fi

  elif echo "$OUTPUT" | grep -q "PDF parse failed"; then
    DETAIL="PDF parse error — check log"
  elif echo "$OUTPUT" | grep -q "Extraction failed"; then
    DETAIL="AI extraction error — check log"
  elif echo "$OUTPUT" | grep -q "429\|quota\|RESOURCE_EXHAUSTED"; then
    DETAIL="API quota exceeded"
  elif echo "$OUTPUT" | grep -q "Fatal error\|fatal error"; then
    DETAIL="fatal error — check log"
  fi

  # ── Print result line ───────────────────────────────────────────────────────
  NAME_DISPLAY="${NAME:0:38}"
  DETAIL_DISPLAY="${DETAIL:0:45}"

  if [ "$STATUS" = "PASS" ]; then
    PASS=$((PASS + 1))
    printf "  ${GREEN}✓${RESET}  [%d/%d] %-40s  %-10s  %s  ${DIM}(%ds)${RESET}\n" \
      "$IDX" "$TOTAL" "$NAME_DISPLAY" "$TYPE" "$DETAIL_DISPLAY" "$ELAPSED"
  else
    FAIL=$((FAIL + 1))
    FAIL_NAMES+=("$NAME")
    printf "  ${RED}✗${RESET}  [%d/%d] %-40s  %-10s  %s  ${DIM}(%ds)${RESET}\n" \
      "$IDX" "$TOTAL" "$NAME_DISPLAY" "$TYPE" "$DETAIL_DISPLAY" "$ELAPSED"
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "$SEP"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}All $TOTAL test(s) passed${RESET}"
else
  echo -e "  ${RED}${BOLD}$FAIL/$TOTAL test(s) failed${RESET}  ($PASS passed)"
  echo ""
  echo -e "  ${RED}Failed:${RESET}"
  for n in "${FAIL_NAMES[@]}"; do
    echo -e "    ${DIM}•${RESET} $n"
  done
  echo ""
  echo -e "  ${DIM}Logs: $LOG_DIR${RESET}"
fi

echo ""

[ $FAIL -eq 0 ] || exit 1

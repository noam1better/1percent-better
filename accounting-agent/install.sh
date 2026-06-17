#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[install]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}   $*"; }
error() { echo -e "${RED}[error]${NC}  $*"; exit 1; }

echo ""
echo "======================================="
echo "  Accounting Agent — Setup"
echo "======================================="
echo ""

# ── Node.js check ────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  error "Node.js not found. Install from https://nodejs.org (v18+)"
fi

NODE_VERSION=$(node -e "process.exit(parseInt(process.versions.node.split('.')[0]) < 18 ? 1 : 0)" 2>/dev/null \
  && node -e "console.log(process.versions.node)" || true)

if ! node -e "process.exit(parseInt(process.versions.node.split('.')[0]) < 18 ? 1 : 0)" 2>/dev/null; then
  error "Node.js v18+ required. Current: $(node -v)"
fi
info "Node.js $(node -v) ✓"

# ── npm check ─────────────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  error "npm not found."
fi
info "npm $(npm -v) ✓"

# ── Folders ───────────────────────────────────────────────────────────────────
info "Creating directories..."
mkdir -p inbox/processed
mkdir -p inbox/duplicates
mkdir -p output
mkdir -p logs
mkdir -p data
info "  inbox/           ← drop PDFs here"
info "  inbox/processed/ ← successfully processed PDFs"
info "  inbox/duplicates/← duplicate PDFs"
info "  output/          ← extracted JSON files"
info "  logs/            ← daily log files"
info "  data/            ← SQLite database"

# ── .env ──────────────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  cp .env.example .env
  warn ".env created from .env.example — add your GEMINI_API_KEY before running"
else
  info ".env already exists — skipping"
fi

# ── npm install ───────────────────────────────────────────────────────────────
info "Installing dependencies..."
npm install --silent
info "Dependencies installed ✓"

# ── SQLite init ───────────────────────────────────────────────────────────────
DB_PATH=$(grep '^DB_PATH' .env 2>/dev/null | cut -d'=' -f2 | tr -d ' ' || echo "./data/accounting.db")
DB_PATH="${DB_PATH:-./data/accounting.db}"

info "Initialising SQLite database at: $DB_PATH"

node -e "
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const dbPath = path.resolve('${DB_PATH}');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(\`
  CREATE TABLE IF NOT EXISTS processed_invoices (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name     TEXT NOT NULL,
    invoice_number TEXT,
    issue_date    TEXT,
    issuer_name   TEXT NOT NULL,
    issuer_tax_id TEXT,
    total_amount  REAL,
    currency      TEXT NOT NULL,
    output_path   TEXT NOT NULL,
    processed_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_invoice_lookup ON processed_invoices (invoice_number, issue_date);
  CREATE INDEX IF NOT EXISTS idx_issuer_lookup  ON processed_invoices (issuer_tax_id, issue_date);
\`);
db.close();
console.log('Database ready.');
"
info "SQLite database initialised ✓"

# ── TypeScript check ──────────────────────────────────────────────────────────
info "Running TypeScript type check..."
npx tsc --noEmit && info "TypeScript ✓" || warn "TypeScript errors found — run 'npm run typecheck' to inspect"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "======================================="
echo "  Setup complete!"
echo "======================================="
echo ""
echo "  Next steps:"
echo "  1. Add your Gemini API key to .env"
echo "     GEMINI_API_KEY=your_key_here"
echo ""
echo "  2. Start the agent:"
echo "     npm run dev"
echo ""
echo "  3. Drop a PDF into ./inbox/ to process it"
echo ""

import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(process.env.DB_PATH ?? './data/accounting.db');

interface IssuerSummary {
  issuer_name: string;
  issuer_tax_id: string | null;
  invoice_count: number;
  total_amount: number;
  currency: string;
}

interface MonthlyTransaction {
  id: number;
  issuer_name: string;
  invoice_number: string | null;
  issue_date: string | null;
  total_amount: number | null;
  currency: string;
  processed_at: string;
}

function getMonthBounds(year: number, month: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${year}-${pad(month)}-01T00:00:00.000Z`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59.999Z`;
  return { start, end };
}

function formatCurrency(amount: number, currency: string): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function bar(value: number, max: number, width = 30): string {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function printReport(year: number, month: number): void {
  const db = new Database(DB_PATH, { readonly: true });

  const { start, end } = getMonthBounds(year, month);
  const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Group by issuer + currency (an issuer may use multiple currencies)
  const summaries = db
    .prepare<[string, string], IssuerSummary>(
      `SELECT
         issuer_name,
         issuer_tax_id,
         COUNT(*)                          AS invoice_count,
         COALESCE(SUM(total_amount), 0)   AS total_amount,
         currency
       FROM processed_invoices
       WHERE processed_at >= ? AND processed_at <= ?
         AND total_amount IS NOT NULL
       GROUP BY issuer_name, currency
       ORDER BY total_amount DESC`,
    )
    .all(start, end);

  const transactions = db
    .prepare<[string, string], MonthlyTransaction>(
      `SELECT id, issuer_name, invoice_number, issue_date, total_amount, currency, processed_at
       FROM processed_invoices
       WHERE processed_at >= ? AND processed_at <= ?
       ORDER BY processed_at DESC`,
    )
    .all(start, end);

  db.close();

  const totalInvoices = transactions.length;
  const grandTotals: Record<string, number> = {};
  summaries.forEach((s) => {
    grandTotals[s.currency] = (grandTotals[s.currency] ?? 0) + s.total_amount;
  });

  const SEP = '─'.repeat(70);
  const THICK = '═'.repeat(70);

  console.log();
  console.log(THICK);
  console.log(`  ACCOUNTING REPORT — ${monthLabel.toUpperCase()}`);
  console.log(`  Generated: ${new Date().toLocaleString('en-US')}`);
  console.log(THICK);

  if (summaries.length === 0) {
    console.log('\n  No invoices processed this month.\n');
    return;
  }

  // ── Summary by Issuer ──────────────────────────────────────────────────────
  console.log('\n  BY ISSUER\n');

  const maxAmount = Math.max(...summaries.map((s) => s.total_amount));

  summaries.forEach((s) => {
    const taxId = s.issuer_tax_id ? ` (Tax ID: ${s.issuer_tax_id})` : '';
    console.log(`  ${s.issuer_name}${taxId}`);
    console.log(`  ${bar(s.total_amount, maxAmount)}  ${formatCurrency(s.total_amount, s.currency)}`);
    console.log(`  ${s.invoice_count} invoice${s.invoice_count !== 1 ? 's' : ''}`);
    console.log();
  });

  // ── Grand Totals ───────────────────────────────────────────────────────────
  console.log(SEP);
  console.log(`  TOTAL INVOICES PROCESSED: ${totalInvoices}`);
  Object.entries(grandTotals).forEach(([currency, total]) => {
    console.log(`  TOTAL VOLUME:             ${formatCurrency(total, currency)}`);
  });
  console.log(SEP);

  // ── Transaction Log ────────────────────────────────────────────────────────
  if (transactions.length > 0) {
    console.log('\n  TRANSACTION LOG\n');
    console.log(`  ${'#'.padEnd(4)} ${'DATE'.padEnd(12)} ${'ISSUER'.padEnd(28)} ${'INVOICE #'.padEnd(18)} ${'AMOUNT'.padStart(16)}`);
    console.log('  ' + '─'.repeat(80));

    transactions.forEach((t, i) => {
      const date = t.issue_date ?? t.processed_at.split('T')[0];
      const issuer = t.issuer_name.slice(0, 26).padEnd(28);
      const invNum = (t.invoice_number ?? '—').slice(0, 16).padEnd(18);
      const amount = t.total_amount != null
        ? formatCurrency(t.total_amount, t.currency).padStart(16)
        : '          —'.padStart(16);
      console.log(`  ${String(i + 1).padEnd(4)} ${date.padEnd(12)} ${issuer} ${invNum} ${amount}`);
    });
  }

  console.log();
  console.log(THICK);
  console.log();
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const now = new Date();

let year = now.getFullYear();
let month = now.getMonth() + 1;

// Optional: pass YYYY-MM to report on a different month
if (args[0]) {
  const match = args[0].match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    console.error('Usage: npm run report [YYYY-MM]');
    process.exit(1);
  }
  year = parseInt(match[1]);
  month = parseInt(match[2]);
}

try {
  printReport(year, month);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Report failed:', msg);
  if (msg.includes('no such file') || msg.includes('unable to open')) {
    console.error('Database not found. Run ./install.sh first, then process some invoices.');
  }
  process.exit(1);
}

import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(process.env.DB_PATH ?? './data/accounting.db');

interface InvoiceRow {
  id: number;
  file_name: string;
  invoice_number: string | null;
  issue_date: string | null;
  issuer_name: string;
  issuer_tax_id: string | null;
  total_amount: number | null;
  currency: string;
  processed_at: string;
}

interface MonthTotalRow {
  currency: string;
  total: number;
  count: number;
}

export interface DashboardData {
  monthTotals: { currency: string; total: number; count: number }[];
  latestInvoices: InvoiceRow[];
  allTimeCount: number;
  month: string;
}

export async function GET() {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthStart = `${year}-${month}-01T00:00:00.000Z`;
    const monthEnd = `${year}-${month}-31T23:59:59.999Z`;
    const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const monthTotals = db
      .prepare<[string, string], MonthTotalRow>(
        `SELECT currency,
                COALESCE(SUM(total_amount), 0) AS total,
                COUNT(*) AS count
         FROM processed_invoices
         WHERE processed_at >= ? AND processed_at <= ?
           AND total_amount IS NOT NULL
         GROUP BY currency
         ORDER BY total DESC`,
      )
      .all(monthStart, monthEnd);

    const latestInvoices = db
      .prepare<[], InvoiceRow>(
        `SELECT id, file_name, invoice_number, issue_date, issuer_name,
                issuer_tax_id, total_amount, currency, processed_at
         FROM processed_invoices
         ORDER BY processed_at DESC
         LIMIT 20`,
      )
      .all();

    const { total: allTimeCount } = db
      .prepare<[], { total: number }>('SELECT COUNT(*) AS total FROM processed_invoices')
      .get()!;

    db.close();

    return NextResponse.json<DashboardData>({
      monthTotals,
      latestInvoices,
      allTimeCount,
      month: monthLabel,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('no such file') || msg.includes('unable to open')) {
      return NextResponse.json<DashboardData>({
        monthTotals: [],
        latestInvoices: [],
        allTimeCount: 0,
        month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

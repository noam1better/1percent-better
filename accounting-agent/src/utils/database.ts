import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface InvoiceRecord {
  id?: number;
  fileName: string;
  invoiceNumber: string | null;
  issueDate: string | null;
  issuerName: string;
  issuerTaxId: string | null;
  totalAmount: number | null;
  currency: string;
  outputPath: string;
  processedAt: string;
}

export interface DuplicateMatch {
  id: number;
  fileName: string;
  processedAt: string;
}

const DB_PATH = path.resolve(process.env.DB_PATH ?? './data/accounting.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS processed_invoices (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name    TEXT NOT NULL,
      invoice_number TEXT,
      issue_date   TEXT,
      issuer_name  TEXT NOT NULL,
      issuer_tax_id TEXT,
      total_amount REAL,
      currency     TEXT NOT NULL,
      output_path  TEXT NOT NULL,
      processed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_invoice_lookup
      ON processed_invoices (invoice_number, issue_date);

    CREATE INDEX IF NOT EXISTS idx_issuer_lookup
      ON processed_invoices (issuer_tax_id, issue_date);
  `);

  return _db;
}

/**
 * Check if invoice already exists in DB.
 * Primary match: invoice_number + issue_date (both non-null).
 * Fallback match: issuer_tax_id + issue_date + total_amount (catches unnumbered invoices).
 */
export function findDuplicate(record: Omit<InvoiceRecord, 'outputPath' | 'processedAt'>): DuplicateMatch | null {
  const db = getDb();

  if (record.invoiceNumber && record.issueDate) {
    const row = db
      .prepare(
        `SELECT id, file_name, processed_at FROM processed_invoices
         WHERE invoice_number = ? AND issue_date = ? LIMIT 1`,
      )
      .get(record.invoiceNumber, record.issueDate) as DuplicateMatch | undefined;

    if (row) return row;
  }

  if (record.issuerTaxId && record.issueDate && record.totalAmount != null) {
    const row = db
      .prepare(
        `SELECT id, file_name, processed_at FROM processed_invoices
         WHERE issuer_tax_id = ? AND issue_date = ? AND total_amount = ? LIMIT 1`,
      )
      .get(record.issuerTaxId, record.issueDate, record.totalAmount) as DuplicateMatch | undefined;

    if (row) return row;
  }

  return null;
}

export function insertInvoice(record: InvoiceRecord): number {
  const db = getDb();

  const result = db
    .prepare(
      `INSERT INTO processed_invoices
        (file_name, invoice_number, issue_date, issuer_name, issuer_tax_id, total_amount, currency, output_path, processed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      record.fileName,
      record.invoiceNumber ?? null,
      record.issueDate ?? null,
      record.issuerName,
      record.issuerTaxId ?? null,
      record.totalAmount ?? null,
      record.currency,
      record.outputPath,
      record.processedAt,
    );

  return result.lastInsertRowid as number;
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}

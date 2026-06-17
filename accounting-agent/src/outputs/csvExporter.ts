import fs from 'fs';
import path from 'path';
import type { Exporter, ExportMeta } from './index';
import type { ProcessingResult } from '../agents/documentProcessor';
import { logger } from '../utils/logger';

const CSV_DIR = path.resolve(process.env.CSV_DIR ?? './output/csv');

function escape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Quote fields that contain comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(...fields: (string | number | null | undefined)[]): string {
  return fields.map(escape).join(',');
}

function appendCsv(filePath: string, header: string, dataRow: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const exists = fs.existsSync(filePath);
  const line = (!exists ? header + '\n' : '') + dataRow + '\n';
  fs.appendFileSync(filePath, line, 'utf-8');
}

export class CsvExporter implements Exporter {
  readonly name = 'csv';

  async export(
    result: ProcessingResult & { success: true },
    meta: ExportMeta,
  ): Promise<void> {
    if (result.documentType === 'invoice') {
      this.exportInvoice(result.data, meta);
    } else {
      this.exportBankStatement(result.data, meta);
    }
  }

  private exportInvoice(
    inv: Extract<ProcessingResult & { success: true }, { documentType: 'invoice' }>['data'],
    meta: ExportMeta,
  ): void {
    // ── invoices.csv — one row per invoice ───────────────────────────────────
    const invoiceCsv = path.join(CSV_DIR, 'invoices.csv');
    const invoiceHeader = row(
      'processed_at', 'file_name', 'invoice_number', 'issue_date', 'due_date',
      'issuer_name', 'issuer_tax_id', 'issuer_email',
      'recipient_name', 'recipient_tax_id',
      'subtotal', 'total_tax', 'discount', 'total_amount', 'currency',
      'payment_method', 'payment_terms', 'confidence', 'json_output',
    );
    const invoiceRow = row(
      meta.processedAt, meta.fileName,
      inv.invoiceNumber, inv.issueDate, inv.dueDate,
      inv.issuer.name, inv.issuer.taxId, inv.issuer.email,
      inv.recipient?.name, inv.recipient?.taxId,
      inv.subtotal, inv.totalTax, inv.discount, inv.totalAmount, inv.currency,
      inv.paymentMethod, inv.paymentTerms, inv.confidence, meta.jsonOutputPath,
    );
    appendCsv(invoiceCsv, invoiceHeader, invoiceRow);
    logger.info(`CSV: invoice row appended`, { file: invoiceCsv });

    // ── invoice_line_items.csv — one row per line item ───────────────────────
    if (inv.lineItems.length > 0) {
      const linesCsv = path.join(CSV_DIR, 'invoice_line_items.csv');
      const linesHeader = row(
        'processed_at', 'file_name', 'invoice_number',
        'description', 'quantity', 'unit_price', 'total_amount', 'tax_rate', 'tax_amount',
      );
      for (const item of inv.lineItems) {
        const lineRow = row(
          meta.processedAt, meta.fileName, inv.invoiceNumber,
          item.description, item.quantity, item.unitPrice,
          item.totalAmount, item.taxRate, item.taxAmount,
        );
        appendCsv(linesCsv, linesHeader, lineRow);
      }
      logger.info(`CSV: ${inv.lineItems.length} line item(s) appended`, { file: linesCsv });
    }
  }

  private exportBankStatement(
    bs: Extract<ProcessingResult & { success: true }, { documentType: 'bank_statement' }>['data'],
    meta: ExportMeta,
  ): void {
    // ── bank_transactions.csv — one row per transaction ──────────────────────
    const txCsv = path.join(CSV_DIR, 'bank_transactions.csv');
    const txHeader = row(
      'processed_at', 'file_name', 'bank_name', 'account_holder', 'account_number',
      'currency', 'period_start', 'period_end',
      'tx_date', 'description', 'reference', 'debit', 'credit', 'balance', 'category',
    );

    for (const tx of bs.transactions) {
      const txRow = row(
        meta.processedAt, meta.fileName, bs.bankName, bs.accountHolder, bs.accountNumber,
        bs.currency, bs.periodStart, bs.periodEnd,
        tx.date, tx.description, tx.reference, tx.debit, tx.credit, tx.balance, tx.category,
      );
      appendCsv(txCsv, txHeader, txRow);
    }
    logger.info(`CSV: ${bs.transactions.length} transaction(s) appended`, { file: txCsv });
  }
}

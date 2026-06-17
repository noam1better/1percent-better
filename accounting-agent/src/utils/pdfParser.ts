import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface ParsedDocument {
  text: string;
  pages: number;
  filePath: string;
  fileName: string;
  sizeBytes: number;
}

export async function parsePDF(filePath: string): Promise<ParsedDocument> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext !== '.pdf') {
    throw new Error(`Expected .pdf file, got: ${ext}`);
  }

  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);

  return {
    text: (data.text as string).trim(),
    pages: data.numpages as number,
    filePath,
    fileName: path.basename(filePath),
    sizeBytes: buffer.length,
  };
}

export function detectDocumentType(text: string): 'invoice' | 'bank_statement' | 'unknown' {
  const lower = text.toLowerCase();

  const invoiceKeywords = ['invoice', 'חשבונית', 'חשבון', 'receipt', 'קבלה', 'total due', 'amount due', 'bill to', 'pay to'];
  const bankKeywords = ['bank statement', 'דף חשבון', 'account statement', 'balance', 'debit', 'credit', 'transaction', 'opening balance'];

  const invoiceScore = invoiceKeywords.filter((kw) => lower.includes(kw)).length;
  const bankScore = bankKeywords.filter((kw) => lower.includes(kw)).length;

  if (invoiceScore === 0 && bankScore === 0) return 'unknown';
  return invoiceScore >= bankScore ? 'invoice' : 'bank_statement';
}

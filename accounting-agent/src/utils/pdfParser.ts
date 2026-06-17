import fs from 'fs';
import path from 'path';

export interface ParsedDocument {
  text: string;
  pages: number;
  filePath: string;
  fileName: string;
  sizeBytes: number;
}

// Suppress pdfjs canvas/font warnings before require — they fire at load time
const _warn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('DOMMatrix') || msg.includes('Path2D') || msg.includes('fetchStandardFontData') || msg.includes('standardFontDataUrl')) return;
  _warn(...args);
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

// Disable worker — text extraction doesn't need canvas/rendering
pdfjs.GlobalWorkerOptions.workerSrc = false;

export async function parsePDF(filePath: string): Promise<ParsedDocument> {
  if (path.extname(filePath).toLowerCase() !== '.pdf') {
    throw new Error(`Expected .pdf file, got: ${path.extname(filePath)}`);
  }

  const buffer = fs.readFileSync(filePath);

  const doc = await pdfjs
    .getDocument({ data: new Uint8Array(buffer), standardFontDataUrl: null })
    .promise;

  let text = '';
  for (let i = 1; i <= (doc.numPages as number); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += (content.items as Array<{ str: string }>).map((item) => item.str).join(' ') + '\n';
  }

  return {
    text: text.trim(),
    pages: doc.numPages as number,
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

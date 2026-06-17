import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import {
  InvoiceSchema,
  BankStatementSchema,
  INVOICE_GEMINI_SCHEMA,
  BANK_STATEMENT_GEMINI_SCHEMA,
  type Invoice,
  type BankStatement,
} from '../schemas';
import { logger } from '../utils/logger';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

const INVOICE_SYSTEM_PROMPT = `You are an expert accounting document parser. Extract all financial data from the invoice or receipt text.

Rules:
- Dates: ISO 8601 format (YYYY-MM-DD), null if absent
- Amounts: numeric values only, no currency symbols or commas
- confidence: 0.0–1.0 — how certain you are about the extraction quality
- taxId: business registration or VAT number
- If field not found, return null
- Israeli documents: currency is likely ILS, tax rate likely 17%`;

const BANK_STATEMENT_SYSTEM_PROMPT = `You are an expert accounting document parser. Extract all transaction data from the bank statement text.

Rules:
- Dates: ISO 8601 format (YYYY-MM-DD)
- Amounts: positive numeric values only (sign conveyed by debit/credit field)
- confidence: 0.0–1.0 — how certain you are about the extraction quality
- Classify each transaction category based on the description
- If field not found, return null`;

export type ProcessingResult =
  | { success: true; documentType: 'invoice'; data: Invoice }
  | { success: true; documentType: 'bank_statement'; data: BankStatement }
  | { success: false; documentType: 'unknown'; error: string };

export class DocumentProcessor {
  private genai: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set. Add it to your .env file.');
    this.genai = new GoogleGenAI({ apiKey: key });
  }

  async process(
    text: string,
    detectedType: 'invoice' | 'bank_statement' | 'unknown',
  ): Promise<ProcessingResult> {
    const docType = detectedType === 'unknown' ? 'invoice' : detectedType;
    logger.debug(`Processing as: ${docType}`, { textLength: text.length });

    try {
      if (docType === 'invoice') {
        return await this.processInvoice(text);
      } else {
        return await this.processBankStatement(text);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Gemini processing failed', { error: message });
      return { success: false, documentType: 'unknown', error: message };
    }
  }

  private async processInvoice(text: string): Promise<ProcessingResult> {
    const response = await this.genai.models.generateContent({
      model: MODEL,
      contents: `Extract all invoice data from this document:\n\n${text}`,
      config: {
        systemInstruction: INVOICE_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: INVOICE_GEMINI_SCHEMA,
      },
    });

    const raw = response.text;
    if (!raw) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(raw);
    const validated = InvoiceSchema.parse({ ...parsed, documentType: 'invoice' });

    return { success: true, documentType: 'invoice', data: validated };
  }

  private async processBankStatement(text: string): Promise<ProcessingResult> {
    const response = await this.genai.models.generateContent({
      model: MODEL,
      contents: `Extract all transaction data from this bank statement:\n\n${text}`,
      config: {
        systemInstruction: BANK_STATEMENT_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: BANK_STATEMENT_GEMINI_SCHEMA,
      },
    });

    const raw = response.text;
    if (!raw) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(raw);
    const validated = BankStatementSchema.parse({ ...parsed, documentType: 'bank_statement' });

    return { success: true, documentType: 'bank_statement', data: validated };
  }
}

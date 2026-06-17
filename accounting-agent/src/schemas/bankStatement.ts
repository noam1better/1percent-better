import { z } from 'zod';

export const TransactionSchema = z.object({
  date: z.string(),
  description: z.string(),
  reference: z.string().nullable(),
  debit: z.number().nullable(),
  credit: z.number().nullable(),
  balance: z.number().nullable(),
  category: z
    .enum([
      'salary',
      'rent',
      'utilities',
      'tax',
      'supplies',
      'transfer',
      'fee',
      'refund',
      'other',
    ])
    .nullable(),
});

export const BankStatementSchema = z.object({
  documentType: z.literal('bank_statement'),
  bankName: z.string().nullable(),
  accountHolder: z.string().nullable(),
  accountNumber: z.string().nullable(),
  currency: z.enum(['ILS', 'USD', 'EUR', 'GBP', 'OTHER']),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  openingBalance: z.number().nullable(),
  closingBalance: z.number().nullable(),
  totalDebits: z.number().nullable(),
  totalCredits: z.number().nullable(),
  transactions: z.array(TransactionSchema),
  confidence: z.number().min(0).max(1),
});

export type BankStatement = z.infer<typeof BankStatementSchema>;

export const BANK_STATEMENT_GEMINI_SCHEMA = {
  type: 'object',
  properties: {
    documentType: { type: 'string', enum: ['bank_statement'] },
    bankName: { type: 'string', nullable: true },
    accountHolder: { type: 'string', nullable: true },
    accountNumber: { type: 'string', nullable: true },
    currency: { type: 'string', enum: ['ILS', 'USD', 'EUR', 'GBP', 'OTHER'] },
    periodStart: { type: 'string', nullable: true },
    periodEnd: { type: 'string', nullable: true },
    openingBalance: { type: 'number', nullable: true },
    closingBalance: { type: 'number', nullable: true },
    totalDebits: { type: 'number', nullable: true },
    totalCredits: { type: 'number', nullable: true },
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          description: { type: 'string' },
          reference: { type: 'string', nullable: true },
          debit: { type: 'number', nullable: true },
          credit: { type: 'number', nullable: true },
          balance: { type: 'number', nullable: true },
          category: {
            type: 'string',
            nullable: true,
            enum: ['salary', 'rent', 'utilities', 'tax', 'supplies', 'transfer', 'fee', 'refund', 'other'],
          },
        },
        required: ['date', 'description'],
      },
    },
    confidence: { type: 'number' },
  },
  required: ['documentType', 'currency', 'transactions', 'confidence'],
} as const;

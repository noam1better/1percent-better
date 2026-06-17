import { z } from 'zod';

export const InvoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  totalAmount: z.number(),
  taxRate: z.number().nullable(),
  taxAmount: z.number().nullable(),
});

export const PartySchema = z.object({
  name: z.string(),
  taxId: z.string().nullable(),
  address: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

export const InvoiceSchema = z.object({
  documentType: z.literal('invoice'),
  invoiceNumber: z.string().nullable(),
  issueDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  currency: z.enum(['ILS', 'USD', 'EUR', 'GBP', 'OTHER']),
  issuer: PartySchema,
  recipient: PartySchema.nullable(),
  lineItems: z.array(InvoiceLineItemSchema),
  subtotal: z.number().nullable(),
  totalTax: z.number().nullable(),
  totalAmount: z.number().nullable(),
  discount: z.number().nullable(),
  paymentMethod: z.string().nullable(),
  paymentTerms: z.string().nullable(),
  notes: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type Invoice = z.infer<typeof InvoiceSchema>;

/** Gemini structured output schema for invoices */
export const INVOICE_GEMINI_SCHEMA = {
  type: 'object',
  properties: {
    documentType: { type: 'string', enum: ['invoice'] },
    invoiceNumber: { type: 'string', nullable: true },
    issueDate: { type: 'string', nullable: true },
    dueDate: { type: 'string', nullable: true },
    currency: { type: 'string', enum: ['ILS', 'USD', 'EUR', 'GBP', 'OTHER'] },
    issuer: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        taxId: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        phone: { type: 'string', nullable: true },
      },
      required: ['name'],
    },
    recipient: {
      type: 'object',
      nullable: true,
      properties: {
        name: { type: 'string' },
        taxId: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        phone: { type: 'string', nullable: true },
      },
      required: ['name'],
    },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity: { type: 'number', nullable: true },
          unitPrice: { type: 'number', nullable: true },
          totalAmount: { type: 'number' },
          taxRate: { type: 'number', nullable: true },
          taxAmount: { type: 'number', nullable: true },
        },
        required: ['description', 'totalAmount'],
      },
    },
    subtotal: { type: 'number', nullable: true },
    totalTax: { type: 'number', nullable: true },
    totalAmount: { type: 'number', nullable: true },
    discount: { type: 'number', nullable: true },
    paymentMethod: { type: 'string', nullable: true },
    paymentTerms: { type: 'string', nullable: true },
    notes: { type: 'string', nullable: true },
    confidence: { type: 'number' },
  },
  required: ['documentType', 'currency', 'issuer', 'lineItems', 'confidence'],
} as const;

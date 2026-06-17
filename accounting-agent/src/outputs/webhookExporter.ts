import https from 'https';
import http from 'http';
import { URL } from 'url';
import type { Exporter, ExportMeta } from './index';
import type { ProcessingResult } from '../agents/documentProcessor';
import { logger } from '../utils/logger';

const EXPORT_URL = process.env.EXPORT_WEBHOOK_URL ?? '';
const EXPORT_SECRET = process.env.EXPORT_WEBHOOK_SECRET ?? '';
const EXPORT_TIMEOUT_MS = parseInt(process.env.EXPORT_WEBHOOK_TIMEOUT_MS ?? '10000', 10);
const MAX_RETRIES = 2;

interface ExportPayload {
  event: 'invoice.processed' | 'bank_statement.processed';
  meta: ExportMeta;
  data: unknown;
}

function post(url: string, body: string, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'accounting-agent/1.0',
          ...headers,
        },
        timeout: EXPORT_TIMEOUT_MS,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );

    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timed out after ${EXPORT_TIMEOUT_MS}ms`)); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendWithRetry(payload: ExportPayload): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {};
  if (EXPORT_SECRET) headers['x-webhook-secret'] = EXPORT_SECRET;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { status, body: resBody } = await post(EXPORT_URL, body, headers);

      if (status >= 200 && status < 300) {
        logger.info(`Webhook export: delivered`, { status, attempt, url: EXPORT_URL });
        return;
      }

      lastError = new Error(`HTTP ${status}: ${resBody.slice(0, 200)}`);
      logger.warn(`Webhook export: attempt ${attempt} failed`, { status, attempt });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.warn(`Webhook export: attempt ${attempt} error`, { error: lastError.message });
    }

    // Exponential backoff: 1s, 2s
    if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, attempt * 1000));
  }

  throw lastError ?? new Error('Webhook export failed after retries');
}

export class WebhookExporter implements Exporter {
  readonly name = 'webhook';

  async export(
    result: ProcessingResult & { success: true },
    meta: ExportMeta,
  ): Promise<void> {
    if (!EXPORT_URL) {
      logger.debug('Webhook export: EXPORT_WEBHOOK_URL not set — skipping');
      return;
    }

    const payload: ExportPayload = {
      event: result.documentType === 'invoice' ? 'invoice.processed' : 'bank_statement.processed',
      meta,
      data: result.data,
    };

    await sendWithRetry(payload);
  }
}

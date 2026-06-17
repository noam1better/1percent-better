import fs from 'fs';
import path from 'path';
import type { Exporter, ExportMeta } from './index';
import type { ProcessingResult } from '../agents/documentProcessor';
import { logger } from '../utils/logger';

const JSON_DIR = path.resolve(process.env.JSON_DIR ?? './output/json');

export class JsonExporter implements Exporter {
  readonly name = 'json';

  async export(result: ProcessingResult & { success: true }, meta: ExportMeta): Promise<void> {
    fs.mkdirSync(JSON_DIR, { recursive: true });

    const entry = {
      processedAt: meta.processedAt,
      fileName: meta.fileName,
      pages: meta.pages,
      documentType: result.documentType,
      data: result.data,
    };

    const file = path.join(
      JSON_DIR,
      result.documentType === 'invoice' ? 'invoices.jsonl' : 'statements.jsonl',
    );

    fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf-8');
    logger.info(`JSON: entry appended`, { file });
  }
}

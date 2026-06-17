import type { ProcessingResult } from '../agents/documentProcessor';

export interface ExportMeta {
  fileName: string;
  processedAt: string;
  pages: number;
  jsonOutputPath: string;
}

export interface Exporter {
  name: string;
  export(result: ProcessingResult & { success: true }, meta: ExportMeta): Promise<void>;
}

export { CsvExporter } from './csvExporter';
export { WebhookExporter } from './webhookExporter';

import { logger } from '../utils/logger';
import { CsvExporter } from './csvExporter';
import { JsonExporter } from './jsonExporter';
import { XmlExporter } from './xmlExporter';
import { WebhookExporter } from './webhookExporter';
import type { Exporter } from './index';

/**
 * OUTPUT_FORMAT — comma-separated list of export formats to activate.
 * Valid values: csv | json | accounting-software-xml | webhook
 * Example: OUTPUT_FORMAT=csv,webhook
 *          OUTPUT_FORMAT=accounting-software-xml
 *          OUTPUT_FORMAT=csv,json,webhook
 */
export function createExporters(): Exporter[] {
  const raw = process.env.OUTPUT_FORMAT ?? 'csv,webhook';
  const tokens = raw
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const exporters: Exporter[] = [];

  for (const token of tokens) {
    switch (token) {
      case 'csv':
        exporters.push(new CsvExporter());
        break;
      case 'json':
        exporters.push(new JsonExporter());
        break;
      case 'accounting-software-xml':
      case 'xml':
        exporters.push(new XmlExporter());
        break;
      case 'webhook':
        exporters.push(new WebhookExporter());
        break;
      default:
        logger.warn(`OUTPUT_FORMAT: unknown format '${token}' — valid: csv, json, accounting-software-xml, webhook`);
    }
  }

  if (exporters.length === 0) {
    logger.warn('OUTPUT_FORMAT: no valid formats — no secondary exports will run');
  } else {
    logger.info(`Exporters active: ${exporters.map((e) => e.name).join(', ')}`);
  }

  return exporters;
}

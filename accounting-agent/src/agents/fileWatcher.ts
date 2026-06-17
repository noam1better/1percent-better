import chokidar from 'chokidar';
import path from 'path';
import { logger } from '../utils/logger';
import { parsePDF, detectDocumentType } from '../utils/pdfParser';
import { writeOutput, markProcessed, markDuplicate } from '../utils/outputWriter';
import { findDuplicate, insertInvoice, closeDb } from '../utils/database';
import { DocumentProcessor } from './documentProcessor';

export class FileWatcher {
  private inboxDir: string;
  private outputDir: string;
  private processor: DocumentProcessor;

  constructor(inboxDir: string, outputDir: string) {
    this.inboxDir = path.resolve(inboxDir);
    this.outputDir = path.resolve(outputDir);
    this.processor = new DocumentProcessor();
  }

  start(): void {
    logger.info('File watcher started', { inbox: this.inboxDir, output: this.outputDir });
    logger.info('Drop a PDF into the inbox folder to process it.');

    const watcher = chokidar.watch(this.inboxDir, {
      ignored: [/processed/, /duplicates/, /^\./],
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 200 },
    });

    watcher.on('add', (filePath: string) => {
      if (path.extname(filePath).toLowerCase() === '.pdf') {
        logger.info(`New PDF detected: ${path.basename(filePath)}`);
        this.handleFile(filePath).catch((err) => {
          logger.error('Unhandled error processing file', { file: filePath, error: String(err) });
        });
      }
    });

    watcher.on('error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Watcher error', { error: msg });
    });

    process.on('SIGINT', () => {
      logger.info('Shutting down watcher...');
      closeDb();
      watcher.close().then(() => process.exit(0));
    });
  }

  async handleFile(filePath: string): Promise<void> {
    const start = Date.now();
    logger.info(`Processing: ${path.basename(filePath)}`);

    let parsed;
    try {
      parsed = await parsePDF(filePath);
      logger.info(`Parsed PDF`, { pages: parsed.pages, chars: parsed.text.length });
    } catch (err) {
      logger.error('PDF parse failed', { file: filePath, error: String(err) });
      return;
    }

    const detectedType = detectDocumentType(parsed.text);
    logger.info(`Detected type: ${detectedType}`);

    const result = await this.processor.process(parsed.text, detectedType);
    const elapsed = Date.now() - start;

    if (!result.success) {
      logger.error('Extraction failed', { file: filePath, error: result.error });
      return;
    }

    // Only invoices are deduped — bank statements lack a stable unique key
    if (result.documentType === 'invoice') {
      const inv = result.data;

      const duplicate = findDuplicate({
        fileName: parsed.fileName,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        issuerName: inv.issuer.name,
        issuerTaxId: inv.issuer.taxId,
        totalAmount: inv.totalAmount,
        currency: inv.currency,
      });

      if (duplicate) {
        logger.warn(`Duplicate invoice detected — skipping`, {
          matchedId: duplicate.id,
          originalFile: duplicate.fileName,
          originalProcessedAt: duplicate.processedAt,
        });
        try {
          markDuplicate(filePath);
          logger.info(`Moved to inbox/duplicates/`);
        } catch {
          logger.warn('Could not move file to duplicates folder');
        }
        return;
      }
    }

    const processedAt = new Date().toISOString();

    const outPath = writeOutput(this.outputDir, {
      fileName: parsed.fileName,
      processedAt,
      documentType: result.documentType,
      pages: parsed.pages,
      sizeBytes: parsed.sizeBytes,
      result: result.data,
    });

    logger.info(`Done in ${elapsed}ms`, { output: outPath });

    if (result.documentType === 'invoice') {
      const inv = result.data;
      logger.info(`Invoice: ${inv.issuer.name} | ${inv.invoiceNumber ?? 'no number'} | ${inv.totalAmount} ${inv.currency}`);

      insertInvoice({
        fileName: parsed.fileName,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        issuerName: inv.issuer.name,
        issuerTaxId: inv.issuer.taxId,
        totalAmount: inv.totalAmount,
        currency: inv.currency,
        outputPath: outPath,
        processedAt,
      });
      logger.info(`Saved to database`);
    } else {
      const bs = result.data;
      logger.info(`Statement: ${bs.bankName ?? 'Unknown bank'} | ${bs.transactions.length} transactions`);
    }

    try {
      markProcessed(filePath);
      logger.info(`Moved to inbox/processed/`);
    } catch {
      logger.warn('Could not move file to processed folder (may already be moved)');
    }
  }
}

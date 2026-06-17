import 'dotenv/config';
import path from 'path';
import { FileWatcher } from './agents/fileWatcher';
import { logger } from './utils/logger';

const INBOX_DIR = process.env.INBOX_DIR ?? './inbox';
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? './output';

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const fileIndex = args.indexOf('--file');

async function processSingleFile(filePath: string): Promise<void> {
  const watcher = new FileWatcher(path.dirname(filePath), OUTPUT_DIR);
  await watcher.handleFile(path.resolve(filePath));
}

async function main() {
  logger.info('=== Accounting Agent v1.0 ===');
  logger.info(`Model: ${process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'}`);

  if (fileIndex !== -1) {
    const filePath = args[fileIndex + 1];
    if (!filePath) {
      logger.error('Usage: npm run process -- --file <path/to/doc.pdf>');
      process.exit(1);
    }
    logger.info(`One-shot mode: ${filePath}`);
    await processSingleFile(filePath);
    return;
  }

  if (isWatch || args.length === 0) {
    const watcher = new FileWatcher(INBOX_DIR, OUTPUT_DIR);
    watcher.start();
    return;
  }

  logger.error('Unknown arguments. Use: npm run dev | npm run watch | npm run process -- --file <pdf>');
  process.exit(1);
}

main().catch((err) => {
  logger.error('Fatal error', { error: String(err) });
  process.exit(1);
});

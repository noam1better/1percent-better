import fs from 'fs';
import path from 'path';

export interface OutputRecord {
  fileName: string;
  processedAt: string;
  documentType: string;
  pages: number;
  sizeBytes: number;
  result: unknown;
}

export function writeOutput(outputDir: string, record: OutputRecord): string {
  fs.mkdirSync(outputDir, { recursive: true });

  const baseName = path.basename(record.fileName, path.extname(record.fileName));
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outputDir, `${baseName}_${ts}.json`);

  fs.writeFileSync(outFile, JSON.stringify(record, null, 2), 'utf-8');
  return outFile;
}

export function markProcessed(filePath: string): void {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, '.pdf');
  const processedPath = path.join(dir, 'processed');
  fs.mkdirSync(processedPath, { recursive: true });
  fs.renameSync(filePath, path.join(processedPath, `${base}.pdf`));
}

export function markDuplicate(filePath: string): void {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, '.pdf');
  const duplicatesPath = path.join(dir, 'duplicates');
  fs.mkdirSync(duplicatesPath, { recursive: true });
  fs.renameSync(filePath, path.join(duplicatesPath, `${base}.pdf`));
}

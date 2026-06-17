import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.WEBHOOK_PORT ?? '3000', 10);
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

// ── Multer: stream directly to inbox/ ────────────────────────────────────────
function createStorage(inboxDir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(inboxDir, { recursive: true });
      cb(null, inboxDir);
    },
    filename: (_req, file, cb) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      cb(null, `${ts}_${safe}`);
    },
  });
}

function pdfFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  if (ext === '.pdf' || mime === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error(`Rejected: expected PDF, got ${mime} (${ext})`));
  }
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!WEBHOOK_SECRET) { next(); return; }

  const token =
    req.headers['x-webhook-secret'] ??
    req.headers['authorization']?.replace(/^Bearer\s+/i, '') ??
    req.query['secret'];

  if (token !== WEBHOOK_SECRET) {
    logger.warn('Webhook: unauthorized request', { ip: req.ip });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// ── Server factory ────────────────────────────────────────────────────────────
export function createServer(inboxDir: string): express.Application {
  const app = express();
  const upload = multer({
    storage: createStorage(path.resolve(inboxDir)),
    fileFilter: pdfFilter,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  });

  app.use(express.json());

  // GET /health — liveness probe for WhatsApp bots / forwarders
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', inbox: path.resolve(inboxDir), ts: new Date().toISOString() });
  });

  // POST /webhook — single PDF upload
  // Field name: 'file'  (multipart/form-data)
  app.post(
    '/webhook',
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) => {
      upload.single('file')(req, res, (err) => {
        if (err) { next(err); return; }
        next();
      });
    },
    (req: Request, res: Response) => {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded. Send a PDF as multipart field "file".' });
        return;
      }

      logger.info('Webhook: file received', {
        original: req.file.originalname,
        saved: req.file.filename,
        size: req.file.size,
        source: req.headers['x-source'] ?? req.ip,
      });

      res.status(202).json({
        status: 'queued',
        file: req.file.filename,
        size: req.file.size,
        message: 'File saved to inbox — processing will begin shortly.',
      });
    },
  );

  // POST /webhook/batch — multiple PDFs in one request
  // Field name: 'files[]'
  app.post(
    '/webhook/batch',
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) => {
      upload.array('files[]', 10)(req, res, (err) => {
        if (err) { next(err); return; }
        next();
      });
    },
    (req: Request, res: Response) => {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded. Send PDFs as multipart field "files[]".' });
        return;
      }

      logger.info(`Webhook batch: ${files.length} file(s) received`, {
        source: req.headers['x-source'] ?? req.ip,
      });

      res.status(202).json({
        status: 'queued',
        count: files.length,
        files: files.map((f) => ({ file: f.filename, size: f.size })),
        message: 'Files saved to inbox — processing will begin shortly.',
      });
    },
  );

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Webhook error', { error: err.message });
    res.status(400).json({ error: err.message });
  });

  return app;
}

export function startServer(inboxDir: string): void {
  const app = createServer(inboxDir);
  app.listen(PORT, () => {
    logger.info(`Webhook server listening on port ${PORT}`, {
      endpoints: ['POST /webhook', 'POST /webhook/batch', 'GET /health'],
      auth: WEBHOOK_SECRET ? 'enabled (x-webhook-secret header)' : 'disabled',
    });
  });
}

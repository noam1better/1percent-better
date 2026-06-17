import fs from 'fs';
import path from 'path';

type Level = 'info' | 'warn' | 'error' | 'debug';

const LEVEL_ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const COLORS: Record<Level, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const RESET = '\x1b[0m';

class Logger {
  private logDir: string;
  private minLevel: Level;
  private logFile: string;

  constructor() {
    this.logDir = path.resolve(process.env.LOG_DIR ?? './logs');
    this.minLevel = (process.env.LOG_LEVEL as Level) ?? 'info';
    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(this.logDir, `agent-${date}.log`);
    fs.mkdirSync(this.logDir, { recursive: true });
  }

  private write(level: Level, message: string, meta?: Record<string, unknown>) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;

    const ts = new Date().toISOString();
    const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
    const plain = `[${ts}] [${level.toUpperCase()}] ${message}${metaStr}`;
    const colored = `${COLORS[level]}[${level.toUpperCase()}]${RESET} ${message}${metaStr}`;

    console.log(colored);
    fs.appendFileSync(this.logFile, plain + '\n');
  }

  info(msg: string, meta?: Record<string, unknown>) { this.write('info', msg, meta); }
  warn(msg: string, meta?: Record<string, unknown>) { this.write('warn', msg, meta); }
  error(msg: string, meta?: Record<string, unknown>) { this.write('error', msg, meta); }
  debug(msg: string, meta?: Record<string, unknown>) { this.write('debug', msg, meta); }
}

export const logger = new Logger();

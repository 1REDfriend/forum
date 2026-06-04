/**
 * Tiny structured logger. JSON lines in production (easy to ship to Loki/ELK),
 * coloured human-readable lines in development. Replaces scattered console.*.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const isProd = process.env.NODE_ENV === 'production';
const COLOR: Record<Level, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const RESET = '\x1b[0m';

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const line = isProd
    ? JSON.stringify({ ts, level, msg, ...(meta ? { meta } : {}) })
    : `${COLOR[level]}${level.toUpperCase().padEnd(5)}${RESET} ${ts}  ${msg}${
        meta ? ' ' + JSON.stringify(meta) : ''
      }`;
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(line + '\n');
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
};

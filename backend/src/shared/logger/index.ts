// shortcut: console wrapper, swap for pino when we need structured logs or log levels in prod.
type Level = 'debug' | 'info' | 'warn' | 'error';

function log(level: Level, message: string, meta?: unknown): void {
  if (process.env.NODE_ENV === 'test') return;
  if (level === 'debug' && process.env.LOG_LEVEL !== 'debug') return; // debug is opt-in
  console[level](`[${level}] ${message}`, ...(meta === undefined ? [] : [meta]));
}

export const logger = {
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
};

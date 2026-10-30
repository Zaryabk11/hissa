// shortcut: console wrapper, swap for pino when we need structured logs or log levels in prod.
type Level = 'info' | 'warn' | 'error';

function log(level: Level, message: string, meta?: unknown): void {
  if (process.env.NODE_ENV === 'test') return;
  console[level](`[${level}] ${message}`, ...(meta === undefined ? [] : [meta]));
}

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
};

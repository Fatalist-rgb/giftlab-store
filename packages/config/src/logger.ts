/**
 * Structured JSON-line logger (T073). One line per event, machine-parseable in Railway
 * log search, human-scannable locally. NO PII policy: never log emails, names, photo
 * URLs or addresses — pass ids (order id, line id, upload id) instead.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
}

export function createLogger(service: string): Logger {
  const write = (level: LogLevel, msg: string, ctx?: Record<string, unknown>) => {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, service, msg, ...ctx });
    if (level === 'error' || level === 'warn') console.error(line);
    else console.log(line);
  };
  return {
    debug: (m, c) => write('debug', m, c),
    info: (m, c) => write('info', m, c),
    warn: (m, c) => write('warn', m, c),
    error: (m, c) => write('error', m, c),
  };
}

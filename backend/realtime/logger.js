/**
 * backend/realtime/logger.js
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Simple Logger para módulos de Realtime
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Crear directorio de logs si no existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

class Logger {
  constructor(module = 'app') {
    this.module = module;
  }

  log(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');

    const logEntry = `[${timestamp}] [${level.toUpperCase()}] [${this.module}] ${message}\n`;

    // Console output
    if (LEVELS[level] <= LEVELS[LOG_LEVEL]) {
      console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](
        `[${this.module}]`, ...args
      );
    }

    // File output
    const logFile = path.join(LOG_DIR, `realtime-${level}.log`);
    try {
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.error('Error escribiendo en log file:', error);
    }
  }

  error(...args) {
    this.log('error', ...args);
  }

  warn(...args) {
    this.log('warn', ...args);
  }

  info(...args) {
    this.log('info', ...args);
  }

  debug(...args) {
    this.log('debug', ...args);
  }
}

module.exports = new Logger('realtime');

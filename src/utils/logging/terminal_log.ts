// Purpose: Captures console output to logs/terminal.log for debugging and analysis.
// Overview: Overrides console methods (log, info, error, warn) to write to both stdout and logs/terminal.log, excluding inquirer menu output.
// - initTerminalLog: Initializes logging, overwriting logs/terminal.log at program start.
// Usage: Call initTerminalLog at program start (e.g., in src/index.ts). Use console.log, console.info, console.error, console.warn for all terminal output to ensure logging. Do NOT use raw process.stdout.write to bypass logging.
// Note: logs/terminal.log is overwritten each run, not in .gitignore, and accessible in the repo for debugging.
// Future Development: Add log levels or filtering (e.g., exclude specific messages) if needed.
// Deep Repo Analysis: Check src/index.ts for initialization, logs/terminal.log for output, src/data-acquisition/user-parameters/menu.ts and src/utils/parameters.ts for console usage.

import fs from 'fs';
import path from 'path';

const TERMINAL_LOG_PATH = path.join(__dirname, '../../../logs/terminal.log');

export function initTerminalLog(): void {
  // Initializes terminal logging by overwriting logs/terminal.log and overriding console methods.
  fs.writeFileSync(TERMINAL_LOG_PATH, '', 'utf-8'); // Overwrite log file

  const originalConsole = {
    log: console.log,
    info: console.info,
    error: console.error,
    warn: console.warn,
  };

  function logToFile(method: string, args: any[]): void {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const message = args
      .map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
      .join(' ');
    const logLine = `[${timestamp}] ${method.toUpperCase()}: ${message}\n`;
    fs.appendFileSync(TERMINAL_LOG_PATH, logLine, 'utf-8');
  }

  console.log = (...args: any[]) => {
    logToFile('log', args);
    originalConsole.log(...args);
  };

  console.info = (...args: any[]) => {
    logToFile('info', args);
    originalConsole.info(...args);
  };

  console.error = (...args: any[]) => {
    logToFile('error', args);
    originalConsole.error(...args);
  };

  console.warn = (...args: any[]) => {
    logToFile('warn', args);
    originalConsole.warn(...args);
  };
}
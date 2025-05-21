import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

export function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans.trim()); }));
}

export function initLogging(): void {
  // Define log file paths
  const logDir = path.join(__dirname, '../../logs');
  const timingLog = path.join(logDir, 'timing.log');
  const rawDataLog = path.join(logDir, 'raw-data.log');
  const errorLog = path.join(logDir, 'error.log');

  // Ensure logs directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Create or clear timing.log
  fs.writeFileSync(timingLog, '');

  // Create or clear raw-data.log
  fs.writeFileSync(rawDataLog, '');

  // Create error.log if it doesn't exist, or append to it if it does
  if (!fs.existsSync(errorLog)) {
    fs.writeFileSync(errorLog, '');
  }

  // Create streams for each log type
  const timingStream = fs.createWriteStream(timingLog, { flags: 'a' });
  const rawDataStream = fs.createWriteStream(rawDataLog, { flags: 'a' });
  const errorStream = fs.createWriteStream(errorLog, { flags: 'a' });

  // Store original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;

  // Override console methods to write to appropriate files
  console.log = (...args: any[]) => {
    originalConsoleLog(...args);
    timingStream.write(`${new Date().toISOString()} [LOG]: ${args.join(' ')}\n`);
  };

  console.error = (...args: any[]) => {
    originalConsoleError(...args);
    errorStream.write(`${new Date().toISOString()} [ERROR]: ${args.join(' ')}\n`);
  };

  console.warn = (...args: any[]) => {
    originalConsoleWarn(...args);
    errorStream.write(`${new Date().toISOString()} [WARN]: ${args.join(' ')}\n`);
  };

  console.info = (...args: any[]) => {
    originalConsoleInfo(...args);
    rawDataStream.write(`${new Date().toISOString()} [INFO]: ${args.join(' ')}\n`);
  };

  // Handle process exit to close all streams
  process.on('exit', () => {
    timingStream.end();
    rawDataStream.end();
    errorStream.end();
  });
}
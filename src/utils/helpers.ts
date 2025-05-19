import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

export function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans.trim()); }));
}

// Initialize logging to a file, deleting previous log if it exists
export function initLogging(logFilePath: string = path.join(__dirname, '../../logs/terminal.log')): void {
  // Ensure logs directory exists
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Delete previous log file if it exists
  if (fs.existsSync(logFilePath)) {
    fs.unlinkSync(logFilePath);
  }

  // Create a write stream for the log file
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

  // Store original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;

  // Override console methods to write to both terminal and file
  console.log = (...args: any[]) => {
    originalConsoleLog(...args);
    logStream.write(`${new Date().toISOString()} [LOG]: ${args.join(' ')}\n`);
  };

  console.error = (...args: any[]) => {
    originalConsoleError(...args);
    logStream.write(`${new Date().toISOString()} [ERROR]: ${args.join(' ')}\n`);
  };

  console.warn = (...args: any[]) => {
    originalConsoleWarn(...args);
    logStream.write(`${new Date().toISOString()} [WARN]: ${args.join(' ')}\n`);
  };

  console.info = (...args: any[]) => {
    originalConsoleInfo(...args);
    logStream.write(`${new Date().toISOString()} [INFO]: ${args.join(' ')}\n`);
  };

  // Handle process exit to close the stream
  process.on('exit', () => {
    logStream.end();
  });
}
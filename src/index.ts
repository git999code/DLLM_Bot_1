// Purpose: Main entry point for DLLM_Bot_1, orchestrating menu navigation.
// Overview: Initializes terminal logging and runs main menu loop, delegating to parameter setting (Option 0).
// Logging: Calls initTerminalLog to capture console output (log, info, error, warn) to logs/terminal.log, excluding inquirer menus. Use console.log, console.error, etc., for all terminal output.
// Archive: Unused code from previous development (e.g., Check portfolio balance, Fetch pools by token CA) is archived in src/archive/index_archive.ts and src/archive/pools.ts for future reference.
// Deep Repo Analysis: Check src/data-acquisition/user-parameters/menu.ts for menu logic, src/utils/logging/terminal_log.ts for logging, src/archive/ for unused code, data/parameters.json and data/secrets.json.enc for parameters, logs/terminal.log for output.

import { showMainMenu, showParametersMenu } from './data-acquisition/user-parameters/menu';
import { initTerminalLog } from './utils/logging/terminal_log';

initTerminalLog(); // Initialize terminal logging

async function main() {
  const options = ['Set Parameters'];
  while (true) {
    try {
      const choice = await showMainMenu(options);
      if (choice === '0') await showParametersMenu();
      else if (choice === 'exit') break;
    } catch (error) {
      console.error('Unexpected error:', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

main();
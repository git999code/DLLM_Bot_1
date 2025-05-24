// Purpose: Main entry point for DLLM_Bot_1, orchestrating menu navigation.
// Overview: Runs main menu loop, delegates to parameter setting (Option 0).
// Archive: Unused code from previous development (e.g., Check portfolio balance, Fetch pools by token CA) is archived in src/archive/index_archive.ts and src/archive/pools.ts for future reference.
// Deep Repo Analysis: Check src/data-acquisition/user-parameters/menu.ts for menu logic, src/archive/ for unused code, data/parameters.json and data/secrets.json.enc for parameters.

import { showMainMenu, showParametersMenu } from './data-acquisition/user-parameters/menu';

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
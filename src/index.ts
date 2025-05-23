// Purpose: Main entry point for DLLM_Bot_1, orchestrating menu navigation
// Complex Logic: Runs main menu loop, delegates to parameter setting
import { showMainMenu, showParametersMenu } from './utils/display/menu';

/* Commented out previous functionalities (to be redeveloped later)
// import { fetchPoolsByCA } from './pools/pools';

// async function checkPortfolioBalance() {
//   console.log('Checking portfolio balance...');
// }

// async function checkDLMMPositions() {
//   console.log('Checking active DLMM positions...');
// }
*/

async function main() {
  const options = ['Set Parameters']; // Removed Exit option
  while (true) {
    try {
      const choice = await showMainMenu(options);
      if (choice === '0') await showParametersMenu();
      else if (choice === 'exit') break; // Separate Exit terminates program
    } catch (error) {
      console.error('Unexpected error:', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

main();
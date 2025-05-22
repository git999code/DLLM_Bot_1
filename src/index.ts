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
  const options = ['Set Parameters', 'Exit'];
  while (true) {
    const choice = await showMainMenu(options);
    if (choice === '0') await showParametersMenu();
    else if (choice === 'exit') break;
    // Commented out previous options
    // else if (choice === '1') await checkPortfolioBalance();
    // else if (choice === '2') await checkDLMMPositions();
    // else if (choice === '3') await fetchPoolsByCA();
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
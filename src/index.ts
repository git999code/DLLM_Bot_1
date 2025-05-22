// Purpose: Main entry point for DLLM_Bot_1, orchestrating menu navigation
// Complex Logic: Runs main menu loop, delegates to specific tasks
import { showMainMenu, showParametersMenu } from './utils/display/menu';
import { checkPortfolioBalance, checkDLMMPositions, fetchPoolsByTokenCA } from './pools/pools';

async function main() {
  const options = [
    'Set Parameters',
    'Check portfolio balance',
    'Check active DLMM positions',
    'Fetch pools by token CA',
  ];
  while (true) {
    const choice = await showMainMenu(options);
    if (choice === '0') await showParametersMenu();
    else if (choice === '1') await checkPortfolioBalance();
    else if (choice === '2') await checkDLMMPositions();
    else if (choice === '3') await fetchPoolsByTokenCA();
    else if (choice === 'exit') break;
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
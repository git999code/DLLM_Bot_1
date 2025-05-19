import * as dotenv from 'dotenv';
import { Connection } from '@solana/web3.js';
import { checkActiveDLMMPositions, formatPositionsForOutput } from './positions/positions';
import { fetchPoolsByCA } from './pools/pools';
import { connectToSolana, checkPortfolioBalance } from './wallet/wallet';
import { askQuestion, initLogging } from './utils/helpers';

dotenv.config();

// Initialize logging to capture terminal output
initLogging();

console.log('SOLANA_RPC_URL:', process.env.SOLANA_RPC_URL);

const RPC_URL = process.env.SOLANA_RPC_URL || '';

if (!RPC_URL) {
  console.error('Please set SOLANA_RPC_URL in your .env file.');
  process.exit(1);
}

async function main() {
  try {
    const connection: Connection = connectToSolana(RPC_URL);

    while (true) {
      console.log('\nChoose an action:');
      console.log('1. Check portfolio balance');
      console.log('2. Check active DLMM positions');
      console.log('3. Fetch pools by token CA');
      console.log('4. Exit');
      const choice = await askQuestion('Enter your choice (1-4): ');

      if (choice === '4') {
        console.log('Exiting...');
        break;
      }

      switch (choice) {
        case '1':
          const walletAddress1 = await askQuestion('Enter wallet address: ');
          if (!walletAddress1) {
            console.error('No wallet address provided. Skipping.');
            break;
          }
          await checkPortfolioBalance(connection, walletAddress1);
          break;

        case '2':
          const walletAddress2 = await askQuestion('Enter wallet address: ');
          if (!walletAddress2) {
            console.error('No wallet address provided. Skipping.');
            break;
          }
          const positions = await checkActiveDLMMPositions(connection, walletAddress2);
          if (positions.length === 0) {
            console.log('No active DLMM positions found for this wallet.');
          } else {
            console.log(`Total active positions: ${positions.length}`);
            const formattedPositions = formatPositionsForOutput(positions, 'cli');
            console.table(formattedPositions);
          }
          break;

        case '3':
          const ca = await askQuestion('Enter token contract address (CA) : ');
          if (!ca) {
            console.error('No contract address provided. Skipping.');
            break;
          }
          await fetchPoolsByCA(ca);
          break;

        default:
          console.log('Invalid choice. Please select 1, 2, 3, or 4.');
      }
    }
  } catch (error: any) {
    console.error('Error:', error?.message || error.toString());
  }
}

main().catch(console.error);
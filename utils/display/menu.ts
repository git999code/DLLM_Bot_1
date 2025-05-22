// Purpose: Provides agnostic menu navigation using inquirer
// Parameters: options array for main menu, none for parameters menu
// Returns: Selected option key for main menu, void for parameters menu
import inquirer from 'inquirer';
import { Parameters, ParametersSchema } from '../config/database-schema';
import { readParameters, writeParameters } from '../parameters';

async function promptInput<T>(
  message: string,
  current: T,
  validate?: (input: string) => string | true,
): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message: `${message} [${current}]`,
      validate,
    },
  ]);
  return value || String(current);
}

export async function showMainMenu(options: string[]): Promise<string> {
  const choices = options.map((opt, i) => ({
    name: `${i}: ${opt}`,
    value: i.toString(),
  }));
  choices.push({ name: 'Exit', value: 'exit' });

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Welcome to DLLM_Bot_1\nUse ↑/↓ to navigate, Enter to select, Ctrl+C to cancel',
      choices,
    },
  ]);
  return choice;
}

export async function showParametersMenu(): Promise<void> {
  let params = await readParameters();

  while (true) {
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Parameters Menu:\nUse ↑/↓ to navigate, Enter to select, Ctrl+C to cancel',
        choices: [
          { name: '1: Default Code Settings', value: 'code' },
          { name: '2: Default Wallet Address', value: 'wallet' },
          { name: 'Back', value: 'back' },
          { name: 'Exit', value: 'exit' },
        ],
      },
    ]);

    if (choice === 'back' || choice === 'exit') break;

    if (choice === 'code') {
      while (true) {
        const { subChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'subChoice',
            message: 'Default Code Settings:\nUse ↑/↓ to navigate, Enter to select, Ctrl+C to cancel',
            choices: [
              { name: `1: Timeout in Seconds (Current: ${params.defaultCodeSettings.timeoutSeconds})`, value: 'timeout' },
              { name: `2: Number of Attempts (Current: ${params.defaultCodeSettings.numberOfAttempts})`, value: 'attempts' },
              { name: 'Back', value: 'back' },
              { name: 'Save and Exit', value: 'save' },
            ],
          },
        ]);

        if (subChoice === 'back') break;
        if (subChoice === 'save') {
          await writeParameters(params);
          console.log('Parameters saved successfully!');
          return;
        }

        if (subChoice === 'timeout') {
          const value = await promptInput(
            'Enter Timeout in Seconds',
            params.defaultCodeSettings.timeoutSeconds,
            (input) => {
              const num = Number(input);
              return !isNaN(num) && num >= 1 ? true : 'Must be a number ≥ 1';
            },
          );
          params.defaultCodeSettings.timeoutSeconds = Number(value);
        } else if (subChoice === 'attempts') {
          const value = await promptInput(
            'Enter Number of Attempts',
            params.defaultCodeSettings.numberOfAttempts,
            (input) => {
              const num = Number(input);
              return !isNaN(num) && num >= 1 ? true : 'Must be a number ≥ 1';
            },
          );
          params.defaultCodeSettings.numberOfAttempts = Number(value);
        }
      }
    } else if (choice === 'wallet') {
      while (true) {
        const { subChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'subChoice',
            message: 'Default Wallet Address:\nUse ↑/↓ to navigate, Enter to select, Ctrl+C to cancel',
            choices: [
              { name: `1: Solana Wallet Address (Current: ${params.defaultWalletAddress.solanaWalletAddress || 'None'})`, value: 'address' },
              { name: `2: Wallet Name (Current: ${params.defaultWalletAddress.walletName || 'None'})`, value: 'name' },
              { name: 'Back', value: 'back' },
              { name: 'Save and Exit', value: 'save' },
            ],
          },
        ]);

        if (subChoice === 'back') break;
        if (subChoice === 'save') {
          await writeParameters(params);
          console.log('Parameters saved successfully!');
          return;
        }

        if (subChoice === 'address') {
          const value = await promptInput(
            'Enter Solana Wallet Address (e.g., 7C4jsPz...)',
            params.defaultWalletAddress.solanaWalletAddress,
            (input) => {
              if (!input) return true;
              return /^[1-9A-HJ-NP-Za-km]{43,44}$/.test(input) ? true : 'Invalid Solana wallet address';
            },
          );
          params.defaultWalletAddress.solanaWalletAddress = value;
        } else if (subChoice === 'name') {
          const value = await promptInput(
            'Enter Wallet Name',
            params.defaultWalletAddress.walletName,
          );
          params.defaultWalletAddress.walletName = value;
        }
      }
    }
  }
}

// Handle Ctrl+C cancellation
process.on('SIGINT', async () => {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Confirm cancellation?',
      default: false,
    },
  ]);
  if (confirmed) process.exit(0);
});
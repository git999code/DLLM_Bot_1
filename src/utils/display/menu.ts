// Purpose: Provides agnostic menu navigation using inquirer
// Parameters: options array for main menu, none for parameters menu
// Returns: Selected option key for main menu, void for parameters menu
import inquirer from 'inquirer';
import { Parameters, ParametersSchema } from '../../config/database-schema';
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
      message: 'Welcome to DLLM_Bot_1\nUse ↑/↓ to navigate, Enter to select',
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
        message: 'Parameters Menu:\nUse ↑/↓ to navigate, Enter to select',
        choices: [
          { name: '1: Default Code Settings', value: 'code' },
          { name: '2: Default Wallet Address', value: 'wallet' },
          { name: 'Cancel', value: 'cancel' },
        ],
      },
    ]);

    if (choice === 'cancel') break;

    if (choice === 'code') {
      const originalCodeSettings = { ...params.defaultCodeSettings }; // Store original
      while (true) {
        const { subChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'subChoice',
            message: 'Default Code Settings:\nUse ↑/↓ to navigate, Enter to select',
            choices: [
              { name: `1: Timeout in Seconds (Current: ${params.defaultCodeSettings.timeoutSeconds})`, value: 'timeout' },
              { name: `2: Number of Attempts (Current: ${params.defaultCodeSettings.numberOfAttempts})`, value: 'attempts' },
              { name: 'Cancel', value: 'cancel' },
              { name: 'Save and Back', value: 'save' },
            ],
          },
        ]);

        if (subChoice === 'cancel') {
          params.defaultCodeSettings = originalCodeSettings; // Restore only code settings
          break;
        }
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
      const originalWalletAddress = { ...params.defaultWalletAddress }; // Store original
      while (true) {
        const { subChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'subChoice',
            message: 'Default Wallet Address:\nUse ↑/↓ to navigate, Enter to select',
            choices: [
              { name: `1: Solana Wallet Address (Current: ${params.defaultWalletAddress.solanaWalletAddress || 'None'})`, value: 'address' },
              { name: `2: Wallet Name (Current: ${params.defaultWalletAddress.walletName || 'None'})`, value: 'name' },
              { name: 'Cancel', value: 'cancel' },
              { name: 'Save and Back', value: 'save' },
            ],
          },
        ]);

        if (subChoice === 'cancel') {
          params.defaultWalletAddress = originalWalletAddress; // Restore only wallet address
          break;
        }
        if (subChoice === 'save') {
          await writeParameters(params);
          console.log('Parameters saved successfully!');
          return;
        }

        if (subChoice === 'address') {
          const value = await promptInput(
            'Enter Solana Wallet Address (e.g., 7C4js...)',
            params.defaultWalletAddress.solanaWalletAddress,
            (input) => {
              if (!input) return true;
              return /^[1-9A-Za-z]{43,44}$/.test(input) ? true : 'Invalid Solana wallet address';
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
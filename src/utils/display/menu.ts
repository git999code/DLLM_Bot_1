// Purpose: Provides agnostic menu navigation using inquirer for parameter management.
// Overview: Implements a hierarchical menu for editing parameters (non-secret in data/parameters.json, secret in data/secrets.json.enc).
// - Main Menu: Lists Set Parameters, Exit (terminates program).
// - Parameter Menu: Lists categories (e.g., Code Settings, Wallet Address). Cancel returns to Main Menu.
// - Sub-Menus: Edit parameters. Non-secrets show current value; secrets show ******. Cancel restores sub-menu values; Save and Back persists changes.
// - Secrets: Displayed as "[description] (secret)" (e.g., "Solana Wallet Address (secret)") with ******, never plain text.
// Windows TTY Issues: inquirer prompts may hang on Windows due to screen clearing or input conflicts. Use ANSI escape codes (\x1B[2J\x1B[H) only in menu prompts, avoid in promptInput.
// Future Development: Add new parameter categories to showParametersMenu, new sub-menus for parameters.
// - For secrets, use retrieveSecret/storeSecret from src/utils/secrets.ts, display as [description] (secret) with ******.
// - Update subChoice choices with new parameters, maintain Cancel/Save and Back behavior.
// Deep Repo Analysis: Check data/parameters.json, data/secrets.json.enc, src/config/database-schema.ts, src/utils/secrets.ts.

import inquirer from 'inquirer';
import { Parameters, ParametersSchema } from '../../config/database-schema';
import { getEncryptionKey, retrieveSecret, storeSecret } from '../secrets';
import { readParameters, writeParameters } from '../parameters';

async function clearScreen(): Promise<void> {
  // Clears terminal screen before each menu prompt to reduce clutter using ANSI escape sequence.
  process.stdout.write('\x1B[2J\x1B[H');
}

async function promptInput<T>(
  message: string,
  current: T,
  validate?: (input: string) => string | true,
  isSecret: boolean = false,
): Promise<string | null> {
  const displayValue = isSecret ? '******' : current;
  const { value } = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message: `${message} [${displayValue}]`,
      validate,
      prefix: '', // Remove ? prefix
    },
  ]);
  if (value === '') return null; // Cancel input
  return value || String(current);
}

export async function showMainMenu(options: string[]): Promise<string> {
  await clearScreen();
  const choices = options.map((opt, i) => ({
    name: `${i}: ${opt}`,
    value: i.toString(),
  }));
  choices.push({ name: 'Exit', value: 'exit' });

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Welcome to DLLM_Bot_1',
      choices,
      prefix: '',
    },
  ]);
  return choice;
}

export async function showParametersMenu(): Promise<void> {
  let params = await readParameters();
  const encryptionKey = await getEncryptionKey();

  while (true) {
    await clearScreen();
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Parameters Menu',
        choices: [
          { name: '1: Default Code Settings', value: 'code' },
          { name: '2: Default Wallet Address', value: 'wallet' },
          { name: 'Cancel', value: 'cancel' },
        ],
        prefix: '',
      },
    ]);

    if (choice === 'cancel') break;

    if (choice === 'code') {
      const originalCodeSettings = { ...params.defaultCodeSettings };
      while (true) {
        await clearScreen();
        const { subChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'subChoice',
            message: 'Default Code Settings',
            choices: [
              { name: `1: Timeout in Seconds (Current: ${params.defaultCodeSettings.timeoutSeconds})`, value: 'timeout' },
              { name: `2: Number of Attempts (Current: ${params.defaultCodeSettings.numberOfAttempts})`, value: 'attempts' },
              { name: 'Cancel', value: 'cancel' },
              { name: 'Save and Back', value: 'save' },
            ],
            prefix: '',
          },
        ]);

        if (subChoice === 'cancel') {
          params.defaultCodeSettings = originalCodeSettings;
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
          if (value === null) break;
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
          if (value === null) break;
          params.defaultCodeSettings.numberOfAttempts = Number(value);
        }
      }
    } else if (choice === 'wallet') {
      const originalWalletAddress = { ...params.defaultWalletAddress };
      const originalSolanaAddress = await retrieveSecret('solanaWalletAddress', encryptionKey);
      while (true) {
        await clearScreen();
        const solanaAddress = await retrieveSecret('solanaWalletAddress', encryptionKey);
        const { subChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'subChoice',
            message: 'Default Wallet Address',
            choices: [
              { name: `1: Solana Wallet Address (secret) (Current: ${solanaAddress ? '******' : 'None'})`, value: 'address' },
              { name: `2: Wallet Name (Current: ${params.defaultWalletAddress.walletName || 'None'})`, value: 'name' },
              { name: 'Cancel', value: 'cancel' },
              { name: 'Save and Back', value: 'save' },
            ],
            prefix: '',
          },
        ]);

        if (subChoice === 'cancel') {
          params.defaultWalletAddress = originalWalletAddress;
          break;
        }
        if (subChoice === 'save') {
          await writeParameters(params);
          console.log('Parameters saved successfully!');
          return;
        }

        if (subChoice === 'address') {
          const value = await promptInput(
            'Enter Solana Wallet Address',
            solanaAddress || '******',
            (input) => {
              if (!input) return true;
              return /^[1-9A-Za-z]{43,44}$/.test(input) ? true : 'Invalid Solana wallet address';
            },
            true,
          );
          if (value === null) break;
          await storeSecret('solanaWalletAddress', value, encryptionKey);
        } else if (subChoice === 'name') {
          const value = await promptInput(
            'Enter Wallet Name',
            params.defaultWalletAddress.walletName,
          );
          if (value === null) break;
          params.defaultWalletAddress.walletName = value;
        }
      }
    }
  }
}
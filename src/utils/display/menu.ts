// Purpose: Provides agnostic menu navigation using inquirer for parameter management.
// Overview: Implements a hierarchical menu for editing parameters stored in data/parameters.json.
// - Main Menu: Displays top-level options (0: Set Parameters, Exit). Exit terminates the program.
// - Parameter Menu: Lists parameter categories (e.g., Default Code Settings, Default Wallet Address). Cancel returns to Main Menu.
// - Sub-Menus: Allow editing specific parameters (e.g., timeoutSeconds, walletName). Cancel restores original sub-menu values; Save and Back persists changes to file.
// Future Development: When adding new parameters, maintain this behavior:
// - Add new categories to showParametersMenu choices.
// - Create new sub-menus with Cancel (restores sub-menu values) and Save and Back (saves to file).
// - Reload original sub-menu values on Cancel using a copy of the relevant params subset.
// Deep Repo Analysis: Check data/parameters.json schema, src/config/database-schema.ts for validation, and src/utils/parameters.ts for file I/O.

import inquirer from 'inquirer';
import { Parameters, ParametersSchema } from '../../config/database-schema';
import { readParameters, writeParameters } from '../parameters';

async function promptInput<T>(
  message: string,
  current: T,
  validate?: (input: string) => string | true,
): Promise<string> {
  // Prompts user for input, pre-filling current value, with optional validation.
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
  // Displays main menu with provided options (e.g., Set Parameters) plus Exit.
  // Returns selected option key (e.g., '0' for Set Parameters, 'exit' to terminate).
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
  // Displays parameter menu for selecting categories (e.g., Code Settings, Wallet Address).
  // Cancel returns to main menu without saving.
  // Sub-menus handle parameter editing; Save and Back writes to data/parameters.json.
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
      // Sub-menu for editing timeoutSeconds and numberOfAttempts.
      const originalCodeSettings = { ...params.defaultCodeSettings }; // Store original for Cancel
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
      // Sub-menu for editing solanaWalletAddress and walletName.
      const originalWalletAddress = { ...params.defaultWalletAddress }; // Store original for Cancel
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
// Purpose: Implements project-specific menu navigation for user parameter management in DLLM_Bot_1.
// Overview: Defines main and parameter menus for editing settings, wallets, and RPC URLs.
// - showMainMenu: Displays top-level menu with Set Parameters and Exit.
// - showParametersMenu: Manages General Settings, Wallets, RPC URLs with project-specific logic.
// Menu Behavior (Agnostic): Inherited from src/utils/display/menuHandler.ts.
// - Non-editable menus: First layer (Parameters Menu) uses "Back to menu" to return to main menu. Deeper layers (Wallets, RPC URLs) use "Back" (previous layer) and "Back to menu" (main menu).
// - Editable menus: Use "Cancel" (discard) and "Save and Back" (persist).
// - Wallets/RPCs: Multiple entries with unique names (enforced at creation/edit), ordered by user-defined numbers (>0, sorted ascending, reindexed 1, 2, 3, ...). Edited wallet/URL gains precedence for its order, shifting others. Default wallet/URL (order 1) labeled "(default)". Deletion with confirmation.
// Logging: Use console.log, console.error, etc., for terminal output (e.g., success messages, errors), automatically logged to logs/terminal.log via src/utils/logging/terminal_log.ts. Do NOT use process.stdout.write to bypass logging.
// Future Development: Add new parameter categories to showParametersMenu, new sub-menus for parameters.
// - For secrets, use retrieveSecret/storeSecret from src/utils/secrets.ts, display as [description] (secret) with ******.
// - Update subChoice choices with new parameters, maintain Back/Back to menu for non-editable menus, Cancel/Save and Back for editable menus.
// Deep Repo Analysis: Check data/parameters.json, data/secrets.json.enc, src/config/database-schema.ts, src/utils/secrets.ts, src/utils/parameters.ts, src/utils/solana/pingRpc.ts, src/utils/display/menuHandler.ts, src/utils/logging/terminal_log.ts, logs/terminal.log.

import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';
import { Parameters, ParametersSchema } from '../../config/database-schema';
import { getEncryptionKey, retrieveSecret, storeSecret } from '../../utils/secrets';
import { readParameters, writeParameters } from '../../utils/parameters';
import { pingRpcUrl } from '../../utils/solana/pingRpc';
import { clearScreen, promptInput } from '../../utils/display/menuHandler';

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
          { name: '1: General Settings (timeout etc)', value: 'code' },
          { name: '2: Wallets', value: 'wallets' },
          { name: '3: RPC URLs', value: 'rpcs' },
          { name: 'Back to menu', value: 'back' },
        ],
        prefix: '',
      },
    ]);

    if (choice === 'back') break;

    if (choice === 'code') {
      const originalCodeSettings = { ...params.defaultCodeSettings };
      while (true) {
        await clearScreen();
        const { subChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'subChoice',
            message: 'General Settings',
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
    } else if (choice === 'wallets') {
      const originalWallets = [...params.defaultWalletAddresses];
      while (true) {
        await clearScreen();
        const sortedWallets = [...params.defaultWalletAddresses].sort((a, b) => a.order - b.order);
        const choices = [
          { name: '1: Add New Wallet', value: 'add' },
          ...sortedWallets.map((wallet, index) => ({
            name: `${index + 2}: Edit Wallet ${wallet.name}${wallet.order === sortedWallets[0].order ? ' (default wallet)' : ''}`,
            value: wallet.id,
          })),
          { name: 'Back', value: 'back' },
          { name: 'Back to menu', value: 'back_to_menu' },
        ];
        const { subChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'subChoice',
            message: 'Wallets',
            choices,
            prefix: '',
          },
        ]);

        if (subChoice === 'back') break;
        if (subChoice === 'back_to_menu') return;

        if (subChoice === 'add') {
          const existingNames = params.defaultWalletAddresses.map(w => w.name);
          const { name } = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Enter Wallet Name',
              validate: (input: string) => input && !existingNames.includes(input) ? true : 'Name must be unique and non-empty',
              prefix: '',
            },
          ]);
          const addressValue = await promptInput(
            'Enter Solana Wallet Address (secret)',
            '******',
            (input) => {
              if (!input) return true;
              return /^[1-9A-Za-z]{43,44}$/.test(input) ? true : 'Invalid Solana wallet address';
            },
            true,
          );
          if (addressValue === null) continue;
          const orderValue = await promptInput(
            'Enter Order (number > 0)',
            '1',
            (input) => {
              const num = Number(input);
              return !isNaN(num) && num > 0 ? true : 'Order must be a number > 0';
            },
          );
          if (orderValue === null) continue;
          const id = uuidv4();
          params.defaultWalletAddresses.push({
            id,
            name,
            order: Number(orderValue),
          });
          await storeSecret(`solanaWalletAddress_${id}`, addressValue, encryptionKey);
        } else {
          const wallet = params.defaultWalletAddresses.find(w => w.id === subChoice);
          if (!wallet) continue;
          // Ensure wallet is properly typed
          const typedWallet = wallet as { id: string; name: string; order: number };
          const originalAddress = await retrieveSecret(`solanaWalletAddress_${typedWallet.id}`, encryptionKey);
          while (true) {
            await clearScreen();
            const currentAddress = await retrieveSecret(`solanaWalletAddress_${wallet.id}`, encryptionKey);
            const { editChoice } = await inquirer.prompt([
              {
                type: 'list',
                name: 'editChoice',
                message: `Edit Wallet ${wallet.name}`,
                choices: [
                  { name: `1: Solana Wallet Address (secret) (Current: ${currentAddress ? '******' : 'None'})`, value: 'address' },
                  { name: `2: Wallet Name (Current: ${wallet.name || 'None'})`, value: 'name' },
                  { name: `3: Order (Current: ${wallet.order})`, value: 'order' },
                  { name: '4: Delete Wallet', value: 'delete' },
                  { name: 'Cancel', value: 'cancel' },
                  { name: 'Save and Back', value: 'save' },
                ],
                prefix: '',
              },
            ]);

            if (editChoice === 'cancel') break;
            if (editChoice === 'save') {
              // Prioritize edited wallet's order, shift others
              const editedOrder = wallet.order;
              const otherWallets = params.defaultWalletAddresses.filter(w => w.id !== wallet.id);
              const sortedOthers = otherWallets.sort((a, b) => a.order - b.order);
              let newOrder = 1;
              params.defaultWalletAddresses = [
                { ...wallet, order: editedOrder }, // Edited wallet keeps its order
                ...sortedOthers.map(w => ({
                  ...w,
                  order: w.order === editedOrder ? ++newOrder : newOrder++,
                })),
              ].sort((a, b) => a.order - b.order).map((w, index) => ({
                ...w,
                order: index + 1, // Reindex to 1, 2, 3, ...
              }));
              await writeParameters(params);
              console.log('Wallet updated successfully!');
              break;
            }
            if (editChoice === 'delete') {
              const { confirm } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'confirm',
                  message: `Do you confirm deletion of wallet ${wallet.name}?`,
                  default: false,
                  prefix: '',
                },
              ]);
              if (confirm) {
                params.defaultWalletAddresses = params.defaultWalletAddresses.filter(w => w.id !== wallet.id);
                await writeParameters(params);
                console.log('Wallet deleted successfully!');
                break;
              }
              continue;
            }

            if (editChoice === 'address') {
              const value = await promptInput(
                'Enter Solana Wallet Address (secret)',
                '******',
                (input) => {
                  if (!input) return true;
                  return /^[1-9A-Za-z]{43,44}$/.test(input) ? true : 'Invalid Solana wallet address';
                },
                true,
              );
              if (value === null) continue;
              await storeSecret(`solanaWalletAddress_${wallet.id}`, value, encryptionKey);
            } else if (editChoice === 'name') {
              const existingNames = params.defaultWalletAddresses.filter(w => w.id !== wallet.id).map(w => w.name);
              const value = await promptInput(
                'Enter Wallet Name',
                wallet.name,
                (input) => input && !existingNames.includes(input) ? true : 'Name must be unique and non-empty',
              );
              if (value === null) continue;
              wallet.name = value;
            } else if (editChoice === 'order') {
              const value = await promptInput(
                'Enter Order (number > 0)',
                wallet.order,
                (input) => {
                  const num = Number(input);
                  return !isNaN(num) && num > 0 ? true : 'Order must be a number > 0';
                },
              );
              if (value === null) continue;
              wallet.order = Number(value);
            }
          }
        }
      }
    } else if (choice === 'rpcs') {
      const originalRpcs = [...params.defaultRpcUrls];
      while (true) {
        await clearScreen();
        const sortedRpcs = [...params.defaultRpcUrls].sort((a, b) => a.order - b.order);
        const choices = [
          { name: '1: Add New RPC URL', value: 'add' },
          ...sortedRpcs.map((rpc, index) => ({
            name: `${index + 2}: Edit RPC URL ${rpc.name}${rpc.order === sortedRpcs[0].order ? ' (default)' : ''}`,
            value: rpc.id,
          })),
          { name: 'Back', value: 'back' },
          { name: 'Back to menu', value: 'back_to_menu' },
        ];
        const { subChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'subChoice',
            message: 'RPC URLs',
            choices,
            prefix: '',
          },
        ]);

        if (subChoice === 'back') break;
        if (subChoice === 'back_to_menu') return;

        if (subChoice === 'add') {
          const existingNames = params.defaultRpcUrls.map(r => r.name);
          const { name } = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Enter RPC URL Name',
              validate: (input: string) => input && !existingNames.includes(input) ? true : 'Name must be unique and non-empty',
              prefix: '',
            },
          ]);
          let urlValue: string | null = null;
          while (true) {
            urlValue = await promptInput(
              'Enter RPC URL (secret)',
              '******',
              (input) => {
                if (!input) return true;
                if (!input.match(/^https?:\/\/.+/)) return 'Invalid URL format';
                return true;
              },
              true,
            );
            if (urlValue === null) break;
            if (urlValue) {
              const valid = await pingRpcUrl(urlValue);
              if (valid) {
                console.log('RPC URL test passed successfully!');
                break;
              }
              const { retry } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'retry',
                  message: 'RPC provided is not responding, retry?',
                  default: true,
                  prefix: '',
                },
              ]);
              if (!retry) {
                urlValue = null;
                break;
              }
            }
          }
          if (urlValue === null) continue;
          const orderValue = await promptInput(
            'Enter Order (number > 0)',
            '1',
            (input) => {
              const num = Number(input);
              return !isNaN(num) && num > 0 ? true : 'Order must be a number > 0';
            },
          );
          if (orderValue === null) continue;
          const id = uuidv4();
          params.defaultRpcUrls.push({
            id,
            name,
            order: Number(orderValue),
          });
          await storeSecret(`rpcUrl_${id}`, urlValue, encryptionKey);
        } else {
          const rpc = params.defaultRpcUrls.find(r => r.id === subChoice);
          if (!rpc) continue;
          const originalUrl = await retrieveSecret(`rpcUrl_${rpc.id}`, encryptionKey);
          while (true) {
            await clearScreen();
            const currentUrl = await retrieveSecret(`rpcUrl_${rpc.id}`, encryptionKey);
            const { editChoice } = await inquirer.prompt([
              {
                type: 'list',
                name: 'editChoice',
                message: `Edit RPC URL ${rpc.name}`,
                choices: [
                  { name: `1: RPC URL (secret) (Current: ${currentUrl ? '******' : 'None'})`, value: 'url' },
                  { name: `2: RPC URL Name (Current: ${rpc.name || 'None'})`, value: 'name' },
                  { name: `3: Order (Current: ${rpc.order})`, value: 'order' },
                  { name: '4: Delete RPC URL', value: 'delete' },
                  { name: 'Cancel', value: 'cancel' },
                  { name: 'Save and Back', value: 'save' },
                ],
                prefix: '',
              },
            ]);

            if (editChoice === 'cancel') break;
            if (editChoice === 'save') {
              // Prioritize edited RPC's order, shift others
              const editedOrder = rpc.order;
              const otherRpcs = params.defaultRpcUrls.filter(r => r.id !== rpc.id);
              const sortedOthers = otherRpcs.sort((a, b) => a.order - b.order);
              let newOrder = 1;
              params.defaultRpcUrls = [
                { ...rpc, order: editedOrder }, // Edited RPC keeps its order
                ...sortedOthers.map(r => ({
                  ...r,
                  order: r.order === editedOrder ? ++newOrder : newOrder++,
                })),
              ].sort((a, b) => a.order - b.order).map((r, index) => ({
                ...r,
                order: index + 1,
              }));
              await writeParameters(params);
              console.log('RPC URL updated successfully!');
              break;
            }
            if (editChoice === 'delete') {
              const { confirm } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'confirm',
                  message: `Do you confirm deletion of RPC URL ${rpc.name}?`,
                  default: false,
                  prefix: '',
                },
              ]);
              if (confirm) {
                params.defaultRpcUrls = params.defaultRpcUrls.filter(r => r.id !== rpc.id);
                await writeParameters(params);
                console.log('RPC URL deleted successfully!');
                break;
              }
              continue;
            }

            if (editChoice === 'url') {
              let value: string | null = null;
              while (true) {
                value = await promptInput(
                  'Enter RPC URL (secret)',
                  '******',
                  (input) => {
                    if (!input) return true;
                    if (!input.match(/^https?:\/\/.+/)) return 'Invalid URL format';
                    return true;
                  },
                  true,
                );
                if (value === null) break;
                if (value) {
                  const valid = await pingRpcUrl(value);
                  if (valid) {
                    console.log('RPC URL test passed successfully!');
                    break;
                  }
                  const { retry } = await inquirer.prompt([
                    {
                      type: 'confirm',
                      name: 'retry',
                      message: 'RPC provided is not responding, retry?',
                      default: true,
                      prefix: '',
                    },
                  ]);
                  if (!retry) {
                    value = null;
                    break;
                  }
                }
              }
              if (value === null) continue;
              await storeSecret(`rpcUrl_${rpc.id}`, value, encryptionKey);
            } else if (editChoice === 'name') {
              const existingNames = params.defaultRpcUrls.filter(r => r.id !== rpc.id).map(r => r.name);
              const value = await promptInput(
                'Enter RPC URL Name',
                rpc.name,
                (input) => input && !existingNames.includes(input) ? true : 'Name must be unique and non-empty',
              );
              if (value === null) continue;
              rpc.name = value;
            } else if (editChoice === 'order') {
              const value = await promptInput(
                'Enter Order (number > 0)',
                rpc.order,
                (input) => {
                  const num = Number(input);
                  return !isNaN(num) && num > 0 ? true : 'Order must be a number > 0';
                },
              );
              if (value === null) continue;
              rpc.order = Number(value);
            }
          }
        }
      }
    }
  }
}
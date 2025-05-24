// Purpose: Provides agnostic menu navigation using inquirer for parameter management.
// Overview: Implements a hierarchical menu for editing parameters (non-secret in data/parameters.json, secret in data/secrets.json.enc).
// - Main Menu: Lists Set Parameters, Exit (terminates program).
// - Parameter Menu: Lists categories (e.g., General Settings, Wallets, RPC URLs). Back returns to Main Menu.
// - Sub-Menus: Non-editable menus (e.g., wallet selection) use "Back". Editable menus (e.g., wallet edit) use "Cancel" (discard changes) and "Save and Back" (persist changes). This is the default behavior for all menus.
// - Secrets: Displayed as "[description] (secret)" (e.g., "Solana Wallet Address (secret)") with ******, never plain text.
// - Wallets/RPCs: Multiple entries with unique names (enforced at creation/edit), ordered by user-defined numbers (>0, sorted ascending, reindexed 1, 2, 3, ...). Edited wallet/URL gains precedence for its order, shifting others. Default wallet/URL (order 1) labeled "(default)". Deletion with confirmation.
// Windows TTY Issues: inquirer prompts may hang on Windows due to screen clearing. Use ANSI escape codes (\x1B[2J\x1B[H) only in menu prompts, avoid in promptInput.
// Future Development: Add new parameter categories to showParametersMenu, new sub-menus for parameters.
// - For secrets, use retrieveSecret/storeSecret from src/utils/secrets.ts, display as [description] (secret) with ******.
// - Update subChoice choices with new parameters, maintain Back for non-editable menus, Cancel/Save and Back for editable menus, ensure unique names and valid orders.
// Deep Repo Analysis: Check data/parameters.json, data/secrets.json.enc, src/config/database-schema.ts, src/utils/secrets.ts, src/utils/parameters.ts, src/utils/solana/pingRpc.ts for RPC validation.

import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';
import { Parameters, ParametersSchema } from '../../config/database-schema';
import { getEncryptionKey, retrieveSecret, storeSecret } from '../secrets';
import { readParameters, writeParameters } from '../parameters';
import { pingRpcUrl } from '../solana/pingRpc';

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
      prefix: '',
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
          { name: '1: General Settings (timeout etc)', value: 'code' },
          { name: '2: Wallets', value: 'wallets' },
          { name: '3: RPC URLs', value: 'rpcs' },
          { name: 'Back', value: 'back' },
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
          const originalAddress = await retrieveSecret(`solanaWalletAddress_${wallet.id}`, encryptionKey);
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
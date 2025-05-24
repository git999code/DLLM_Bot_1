// Purpose: Provides agnostic menu navigation utilities for inquirer-based interfaces.
// Overview: Implements reusable functions for terminal screen clearing, input prompting, and menu behavior.
// - clearScreen: Clears terminal screen using ANSI escape codes.
// - promptInput: Prompts for user input with validation, supports secret display (******).
// Menu Behavior: Non-editable menus (selection only) use a single "Back" option to return to the parent menu. Editable menus (parameter changes) use "Cancel" (discard changes) and "Save and Back" (persist changes). This is the default behavior for all parameter types across projects.
// Windows TTY Issues: inquirer prompts may hang on Windows due to screen clearing. Use clearScreen only in menu prompts, avoid in promptInput to prevent TTY interference.
// Future Development: Add new menu utilities (e.g., multi-select prompts) here, ensuring agnostic design.
// Deep Repo Analysis: Check src/data-acquisition/user-parameters/menu.ts for project-specific menu usage, package.json for inquirer dependency.

import inquirer from 'inquirer';

export async function clearScreen(): Promise<void> {
  // Clears terminal screen using ANSI escape sequence.
  process.stdout.write('\x1B[2J\x1B[H');
}

export async function promptInput<T>(
  message: string,
  current: T,
  validate?: (input: string) => string | true,
  isSecret: boolean = false,
): Promise<string | null> {
  // Prompts user for input, displays current value (****** for secrets), validates input.
  // Returns input string or null if cancelled (empty input).
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
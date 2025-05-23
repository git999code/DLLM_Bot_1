// Purpose: Manages reading, writing, and initializing non-secret parameters in data/parameters.json.
// Overview: Handles non-secret parameters (e.g., timeoutSeconds, walletName), delegates secrets to src/utils/secrets.ts.
// Future Development: Add new non-secret parameters to ParametersSchema, update initParameters.
// Deep Repo Analysis: Check data/parameters.json for non-secrets, data/secrets.json.enc for secrets, src/utils/secrets.ts for encryption.

import fs from 'fs/promises';
import path from 'path';
import { ParametersSchema, Parameters } from '../config/database-schema';

const PARAMETERS_PATH = path.join(__dirname, '../../data/parameters.json');

export async function readParameters(): Promise<Parameters> {
  try {
    const data = await fs.readFile(PARAMETERS_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return ParametersSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to read parameters, using defaults:', error instanceof Error ? error.message : 'Unknown error occurred');
    return initParameters();
  }
}

export async function writeParameters(params: Parameters): Promise<void> {
  try {
    const validated = ParametersSchema.parse(params);
    await fs.writeFile(PARAMETERS_PATH, JSON.stringify(validated, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save parameters:', error instanceof Error ? error.message : 'Unknown error occurred');
    throw error;
  }
}

export function initParameters(): Parameters {
  return {
    defaultCodeSettings: {
      timeoutSeconds: 20,
      numberOfAttempts: 3,
    },
    defaultWalletAddress: {
      walletName: '',
    },
  };
}
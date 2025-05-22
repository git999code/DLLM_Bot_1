// Purpose: Manages reading, writing, and initializing parameters
// Parameters: None for read/init, Parameters object for write
// Returns: Parameters object for read/init, void for write
import fs from 'fs/promises';
import path from 'path';
import { ParametersSchema, Parameters } from '../config/database-schema';

const PARAMETERS_PATH = path.join(__dirname, '../data/parameters.json');

export async function readParameters(): Promise<Parameters> {
  try {
    const data = await fs.readFile(PARAMETERS_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return ParametersSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to read parameters, using defaults:', error.message);
    return initParameters();
  }
}

export async function writeParameters(params: Parameters): Promise<void> {
  try {
    const validated = ParametersSchema.parse(params);
    await fs.writeFile(PARAMETERS_PATH, JSON.stringify(validated, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save parameters, please try again:', error.message);
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
      solanaWalletAddress: '',
      walletName: '',
    },
  };
}
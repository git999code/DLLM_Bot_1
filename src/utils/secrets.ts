// Purpose: Handles encryption, decryption, and storage of secrets (e.g., solanaWalletAddress).
// Overview: Uses AES-256-GCM for symmetric encryption, storing secrets in data/secrets.json.enc.
// - encryptSecret: Encrypts a value with a key, returns base64 ciphertext.
// - decryptSecret: Decrypts a ciphertext, returns plain text.
// - storeSecret: Encrypts and stores a secret in secrets.json.enc.
// - retrieveSecret: Retrieves and decrypts a secret.
// - getEncryptionKey: Prompts for key if empty, stores in memory, saves to data/encryption_key.json (not in GitHub).
// Future Development: Add new secrets by calling storeSecret/retrieveSecret with unique keys.
// - Update src/config/database-schema.ts to flag new secret parameters.
// - Ensure data/secrets.json.enc and data/encryption_key.json are in .gitignore.
// Deep Repo Analysis: Check data/secrets.json.enc for encrypted secrets, data/parameters.json for non-secrets, src/utils/parameters.ts for I/O.

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';

const SECRETS_PATH = path.join(__dirname, '../../data/secrets.json.enc');
const KEY_PATH = path.join(__dirname, '../../data/encryption_key.json');
let encryptionKey: string | null = null;

export async function getEncryptionKey(): Promise<string> {
  // Prompts for encryption key if not set, stores in memory, saves to KEY_PATH for recovery.
  // Not committed to GitHub (.gitignore).
  if (!encryptionKey) {
    try {
      const data = await fs.readFile(KEY_PATH, 'utf-8');
      const parsedData = JSON.parse(data);
      encryptionKey = parsedData.key || '';
    } catch {
      const { key } = await inquirer.prompt([
        {
          type: 'password',
          name: 'key',
          message: 'Enter encryption key (store securely, required to decrypt secrets):',
          validate: (input: string) => input.length >= 8 ? true : 'Key must be at least 8 characters',
        },
      ]);
      encryptionKey = key;
    }
  }
  if (!encryptionKey) {
    throw new Error('Encryption key not initialized');
  }
  return encryptionKey;
}

export async function encryptSecret(value: string, key: string): Promise<string> {
  // Encrypts value using AES-256-GCM, returns base64 ciphertext (iv:ciphertext:authTag).
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key.padEnd(32, '0')), iv);
  let encrypted = cipher.update(value, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, Buffer.from(':', 'utf8'), Buffer.from(encrypted, 'base64'), Buffer.from(':', 'utf8'), authTag]).toString('base64');
}

export async function decryptSecret(ciphertext: string, key: string): Promise<string> {
  // Decrypts base64 ciphertext (iv:ciphertext:authTag), returns plain text.
  const parts = Buffer.from(ciphertext, 'base64').toString('utf8').split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');
  const iv = Buffer.from(parts[0], 'base64');
  const encrypted = parts[1];
  const authTag = Buffer.from(parts[2], 'base64');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key.padEnd(32, '0')), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function storeSecret(secretKey: string, value: string, encryptionKey: string): Promise<void> {
  // Encrypts and stores a secret in secrets.json.enc under secretKey.
  let secrets: Record<string, string> = {};
  try {
    const data = await fs.readFile(SECRETS_PATH, 'utf-8');
    secrets = JSON.parse(data);
  } catch {}
  secrets[secretKey] = await encryptSecret(value, encryptionKey);
  await fs.writeFile(SECRETS_PATH, JSON.stringify(secrets, null, 2), 'utf-8');
}

export async function retrieveSecret(secretKey: string, encryptionKey: string): Promise<string | null> {
  // Retrieves and decrypts a secret by secretKey, returns null if not found.
  try {
    const data = await fs.readFile(SECRETS_PATH, 'utf-8');
    const secrets = JSON.parse(data);
    if (!secrets[secretKey]) return null;
    return await decryptSecret(secrets[secretKey], encryptionKey);
  } catch {
    return null;
  }
}
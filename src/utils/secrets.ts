// Purpose: Handles encryption, decryption, and storage of secrets (e.g., solanaWalletAddress).
// Overview: Uses AES-256-GCM for symmetric encryption, storing secrets in data/secrets.json.enc.
// - encryptSecret: Encrypts a value with a key, returns base64 ciphertext.
// - decryptSecret: Decrypts a ciphertext, returns plain text.
// - storeSecret: Encrypts and stores a secret in secrets.json.enc.
// - retrieveSecret: Retrieves and decrypts a secret.
// - getEncryptionKey: Prompts for key twice (initial and confirmation) if empty, stores in memory, saves to data/encryption_key.json (not in GitHub).
// Key Management: Encryption key is stored in plain text in data/encryption_key.json (.gitignore). Prompted twice on first use (plain text, ≥8 characters). Back up key securely; loss prevents secret decryption. Delete data/encryption_key.json to re-prompt.
// Future Development: Add new secrets by calling storeSecret/retrieveSecret with unique keys.
// - Update src/config/database-schema.ts to flag new secret parameters.
// - Ensure data/secrets.json.enc and data/encryption_key.json are in .gitignore.
// Deep Repo Analysis: Check data/secrets.json.enc for encrypted secrets, data/parameters.json for non-secrets, src/utils/parameters.ts for I/O, data/encryption_key.json for key storage.

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';

const SECRETS_PATH = path.join(__dirname, '../../data/secrets.json.enc');
const KEY_PATH = path.join(__dirname, '../../data/encryption_key.json');
let encryptionKey: string | null = null;

export async function getEncryptionKey(): Promise<string> {
  if (encryptionKey) return encryptionKey;
  try {
    const data = await fs.readFile(KEY_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (typeof parsed.key === 'string' && parsed.key.length >= 8) {
      encryptionKey = parsed.key;
    } else {
      throw new Error('Invalid key in encryption_key.json');
    }
  } catch {
    const { key, confirmKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'key',
        message: 'Enter encryption key (minimum 8 characters, visible):',
        validate: (input: string) => input.length >= 8 ? true : 'Key must be at least 8 characters',
      },
      {
        type: 'input',
        name: 'confirmKey',
        message: 'Confirm encryption key:',
        validate: (input: string, answers: { key: string }) => input === answers.key ? true : 'Keys do not match',
      },
    ]);
    encryptionKey = key;
    await fs.writeFile(KEY_PATH, JSON.stringify({ key }), 'utf-8');
  }
  if (!encryptionKey) throw new Error('Failed to set encryption key');
  return encryptionKey;
}

export async function encryptSecret(value: string, key: string): Promise<string> {
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(key.padEnd(32, '0')), iv);
    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function decryptSecret(ciphertext: string, key: string): Promise<string> {
  try {
    const [iv, encrypted, authTag] = ciphertext.split(':');
    if (!iv || !encrypted || !authTag) throw new Error('Invalid ciphertext format');
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key.padEnd(32, '0')), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function storeSecret(secretKey: string, value: string, encryptionKey: string): Promise<void> {
  let secrets: Record<string, string> = {};
  try {
    const data = await fs.readFile(SECRETS_PATH, 'utf-8');
    secrets = JSON.parse(data);
  } catch {}
  secrets[secretKey] = await encryptSecret(value, encryptionKey);
  await fs.writeFile(SECRETS_PATH, JSON.stringify(secrets, null, 2), 'utf-8');
}

export async function retrieveSecret(secretKey: string, encryptionKey: string): Promise<string | null> {
  try {
    const data = await fs.readFile(SECRETS_PATH, 'utf-8');
    const secrets = JSON.parse(data);
    if (!secrets[secretKey]) return null;
    return await decryptSecret(secrets[secretKey], encryptionKey);
  } catch {
    return null;
  }
}
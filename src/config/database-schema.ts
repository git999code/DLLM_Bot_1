// Purpose: Defines Zod schema for validating non-secret parameters in data/parameters.json.
// Overview: Excludes secret parameters (e.g., solanaWalletAddress, rpcUrl), validated separately in src/utils/secrets.ts.
// - defaultWalletAddresses: Array of wallet objects with unique id (UUID), name (unique), and order (>0).
// - defaultRpcUrls: Array of RPC URL objects with unique id (UUID), name (unique), and order (>0).
// Future Development: Add new non-secret parameters here, update src/utils/parameters.ts for I/O.
// Deep Repo Analysis: Check src/utils/secrets.ts for secret handling, data/parameters.json for schema, src/utils/display/menu.ts for menu logic, src/utils/solana/pingRpc.ts for RPC validation.

import { z } from 'zod';

export const ParametersSchema = z.object({
  defaultCodeSettings: z.object({
    timeoutSeconds: z.number().min(1, 'Timeout must be at least 1 second'),
    numberOfAttempts: z.number().min(1, 'Attempts must be at least 1'),
  }),
  defaultWalletAddresses: z.array(
    z.object({
      id: z.string().uuid(), // Unique identifier, hidden from user
      name: z.string().min(0), // Non-secret name, unique
      order: z.number().positive('Order must be > 0'), // Order for sorting
    })
  ),
  defaultRpcUrls: z.array(
    z.object({
      id: z.string().uuid(), // Unique identifier, hidden from user
      name: z.string().min(0), // Non-secret name, unique
      order: z.number().positive('Order must be > 0'), // Order for sorting
    })
  ),
});

export type Parameters = z.infer<typeof ParametersSchema>;
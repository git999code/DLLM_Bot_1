// Purpose: Defines Zod schema for validating non-secret parameters in data/parameters.json.
// Overview: Excludes secret parameters (e.g., solanaWalletAddress), validated separately in src/utils/secrets.ts.
// Future Development: Add new non-secret parameters here, update src/utils/parameters.ts for I/O.
// Deep Repo Analysis: Check src/utils/secrets.ts for secret handling, data/parameters.json for schema.

import { z } from 'zod';

export const ParametersSchema = z.object({
  defaultCodeSettings: z.object({
    timeoutSeconds: z.number().min(1, 'Timeout must be at least 1 second'),
    numberOfAttempts: z.number().min(1, 'Attempts must be at least 1'),
  }),
  defaultWalletAddress: z.object({
    walletName: z.string().min(0),
  }),
});

export type Parameters = z.infer<typeof ParametersSchema>;
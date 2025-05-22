// Purpose: Defines Zod schema for validating parameters.json
// Returns: Zod schema and TypeScript type for parameters
import { z } from 'zod';

export const ParametersSchema = z.object({
  defaultCodeSettings: z.object({
    timeoutSeconds: z.number().min(1, 'Timeout must be at least 1 second'),
    numberOfAttempts: z.number().min(1, 'Attempts must be at least 1'),
  }),
  defaultWalletAddress: z.object({
    solanaWalletAddress: z.string().min(0).regex(/^$|[1-9A-HJ-NP-Za-km]{43,44}$/, 'Invalid Solana wallet address'),
    walletName: z.string().min(0),
  }),
});

export type Parameters = z.infer<typeof ParametersSchema>;
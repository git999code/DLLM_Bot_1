// Purpose: Validates Solana RPC URLs by pinging with a getHealth JSON-RPC request.
// Overview: Sends a POST request to the RPC URL, checks for 'ok' response, with 3-second timeout using Promise.race.
// Parameters:
// - url: RPC URL to ping (e.g., https://api.mainnet-beta.solana.com).
// Returns: Boolean indicating if the URL is reachable.
// Note: Uses node-fetch@2.6.7, which lacks AbortController support; timeout implemented via Promise.race.
// Future Development: Extend for other Solana RPC methods (e.g., getVersion) or additional providers.
// Deep Repo Analysis: Check src/utils/display/menu.ts for usage, data/secrets.json.enc for stored URLs, package.json for node-fetch dependency.

import fetch from 'node-fetch';

export async function pingRpcUrl(url: string): Promise<boolean> {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), 3000) // 3-second timeout
    );
    const fetchPromise = fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
    }).then(response => response.json());
    const data = await Promise.race([fetchPromise, timeoutPromise]);
    return data.result === 'ok';
  } catch {
    return false;
  }
}
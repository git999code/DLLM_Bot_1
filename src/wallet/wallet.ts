import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export function connectToSolana(rpcUrl: string): Connection {
  return new Connection(rpcUrl);
}

export async function checkPortfolioBalance(connection: Connection, walletAddress: string): Promise<number> {
  try {
    const walletPubkey = new PublicKey(walletAddress);

    // Fetch SOL balance
    const balance = await connection.getBalance(walletPubkey);
    const solBalanceInSol = balance / LAMPORTS_PER_SOL;
    console.log(`Wallet: ${walletPubkey.toBase58()}`);
    console.log(`Balance: ${solBalanceInSol.toFixed(2)} SOL`);

    // Fetch token balances (SPL tokens)
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    console.log('Token Balances:');
    if (tokenAccounts.value.length === 0) {
      console.log('No SPL tokens found in this wallet.');
    } else {
      for (const tokenAccount of tokenAccounts.value) {
        const accountData = tokenAccount.account.data.parsed.info;
        const mintAddress = accountData.mint;
        const balance = accountData.tokenAmount.uiAmount;
        const decimals = accountData.tokenAmount.decimals;

        console.log(`- Mint: ${mintAddress}, Balance: ${balance.toFixed(2)} (Decimals: ${decimals})`);
      }
    }

    return balance;
  } catch (err: any) {
    console.error('Failed to fetch balance:', err.message);
    return 0;
  }
}
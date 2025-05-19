// Check the balance of the test wallet on Solana devnet
const solanaWeb3 = require('@solana/web3.js');
const secret = [99,56,218,4,180,149,130,228,197,5,20,51,212,150,180,24,107,156,11,102,75,140,143,121,80,3,18,162,242,93,157,175,117,63,74,114,113,146,123,19,35,95,227,68,15,205,121,202,187,20,241,100,198,236,109,158,188,239,29,139,93,182,195,183];
const keypair = solanaWeb3.Keypair.fromSecretKey(Uint8Array.from(secret));
const connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');

(async () => {
    const balance = await connection.getBalance(keypair.publicKey);
    console.log('Wallet address:', keypair.publicKey.toBase58());
    console.log('Balance (SOL):', balance / solanaWeb3.LAMPORTS_PER_SOL);
})();

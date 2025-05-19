// Script to generate a Solana wallet and print the private key and public address
const solanaWeb3 = require('@solana/web3.js');

const keypair = solanaWeb3.Keypair.generate();
console.log('Public Address:', keypair.publicKey.toBase58());
console.log('Private Key (JSON array):', JSON.stringify(Array.from(keypair.secretKey)));

import { PublicKey } from '@solana/web3.js';

// TODO : get config variables from system_config ddb table
export const RPC_URL     = process.env.RPC_URL || 'http://127.0.0.1:8899';
export const PROGRAM_ID  = new PublicKey(
  process.env.PROGRAM_ID || 'YrQk4TE5Bi6Hsi4u2LbBNwjZUWEaSUaCDJdapJbCE4z'
);
export const CONCURRENCY = parseInt(process.env.CONCURRENCY || '8', 10);

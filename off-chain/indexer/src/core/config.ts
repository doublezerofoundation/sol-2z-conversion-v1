import { PublicKey } from '@solana/web3.js';
import converterIdlJson from '../../idl/converter_program.json';
import interactorIdlJson from '../../idl/interacting_contract.json';
import { Idl } from '@coral-xyz/anchor';

export const RPC_URL     = process.env.RPC_URL || 'http://127.0.0.1:8899';
export const PROGRAM_ID_CONVERTER  = new PublicKey(
  process.env.PROGRAM_ID_CONVERTER || 'YrQk4TE5Bi6Hsi4u2LbBNwjZUWEaSUaCDJdapJbCE4z'
);
export const PROGRAM_ID_INTERACTOR  = new PublicKey(
  process.env.PROGRAM_ID_2 || 'DBopoT6ddxmWtNhVpef73mwT2zJr6L8KskNAtrt89LnW'
);

export const PROGRAMS = [
  { id: PROGRAM_ID_CONVERTER, idl: converterIdlJson as Idl},
  { id: PROGRAM_ID_INTERACTOR, idl: interactorIdlJson as Idl}
];
export const CONCURRENCY = parseInt(process.env.CONCURRENCY || '8', 10);

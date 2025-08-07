import { Connection, TransactionError } from '@solana/web3.js';
import { BorshCoder, EventParser, Idl } from '@coral-xyz/anchor';
import idlJson from '../../idl/converter_program.json';
import { RPC_URL, PROGRAM_ID } from './config';
import { writeSolanaEvent, writeSolanaError, writeFillDequeue, writeDenyListAction } from '../utils/ddb';

const connection = new Connection(RPC_URL, 'confirmed');
const idl        = idlJson as Idl;
const coder      = new BorshCoder(idl);
const parser     = new EventParser(PROGRAM_ID, coder);

export async function processTx(sig: string) {
     const tx = await connection.getTransaction(sig, { commitment: 'confirmed' });
     if (!tx || !tx.meta) return;

     const slot      = tx.slot ?? 0;
     const secs      = tx.blockTime ?? (await connection.getBlockTime(slot));
     const timestamp = secs || 0;
     const logMessages = tx.meta.logMessages ?? [];
     const { err } = tx.meta;

     if (err) {
          const errorName = handleTxError(sig, err);
          await writeSolanaError(sig, errorName ?? 'UnknownError', logMessages, slot, timestamp);
          return;
     }

     const events = [...parser.parseLogs(logMessages)];
     for (const e of events) {
          console.log(`✅ [${timestamp}] Event ${e.name} @${sig}`, e.data);
          const eventId = `${slot}-${sig}-${e.name}`;
          const safeData = serializeForDynamo(e.data);
          switch (e.name) {
               case 'FillDequeued':
                    await writeFillDequeue(sig, eventId, safeData, slot, timestamp);
                    break;
               case 'DenyListModified':
                    await writeDenyListAction(sig, eventId, safeData, slot, timestamp);
                    break;
               default:
                    await writeSolanaEvent(sig, eventId, e.name, safeData, slot, timestamp);
          }
     }
}

/**
 * Extracts Anchor custom error codes from a TransactionError
 * and logs a human‑readable message (falling back to raw error).
 */
function handleTxError(sig: string, err: TransactionError): string | undefined {

     // pull out the Custom code if present
     let customCode: number | undefined;
     if (typeof err === 'object' && 'InstructionError' in err) {
          const [, info] = (err as any).InstructionError as [number, { Custom?: number }];
          customCode = info.Custom;
     }
   
     // look up in IDL
     if (customCode != null && Array.isArray(idl.errors)) {
          const errDef = idl.errors.find(e => e.code === customCode);
          if (errDef) {
               console.info(`Failed tx ${sig}: ${errDef.name} - ${errDef.msg}`);
               return errDef.name;
          } else {
               console.info(`Failed tx ${sig}: Unknown custom error ${customCode}`);
               return `UnknownCustomError(${customCode})`;
          }
     } else {
          console.info(`Failed tx ${sig}:`, err);
          return 'RawError'; // No custom error found, log raw error
     }
}

/**
 * Recursively serializes any object for DynamoDB storage.
 * - Converts Solana PublicKey instances to base58 strings.
 * - Handles primitives, arrays, and nested objects.
 * - Ensures all values are plain JSON-compatible types (string, number, boolean, array, object).
 * - Prevents unsupported class instances from causing DynamoDB marshalling errors.
 *
 */
function serializeForDynamo(obj: any): any {
     if (obj == null) return obj;
     if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") return obj;
     if (Array.isArray(obj)) return obj.map(serializeForDynamo);
   
     // Solana PublicKey detection 
     if (obj.constructor && obj.constructor.name === "PublicKey" && typeof obj.toString === "function") {
       return obj.toString();
     }
   
     // For objects, recursively serialize each property
     if (typeof obj === "object") {
       const result: any = {};
       for (const key of Object.keys(obj)) {
         result[key] = serializeForDynamo(obj[key]);
       }
       return result;
     }
   
     // Fallback: convert to string
     return String(obj);
}

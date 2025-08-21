import { Connection, TransactionError, PublicKey } from '@solana/web3.js';
import { BorshCoder, EventParser, Idl } from '@coral-xyz/anchor';
import idlJson from '../../idl/converter_program.json';

import Config from '../utils/config';
import { EventType } from '../common';
import { writeSolanaEvent, writeSolanaError, writeFillDequeue, writeDenyListAction } from '../utils/ddb/events';
import { sendErrorNotification } from '../utils/notifications';

const connection = new Connection(Config.RPC_URL, 'confirmed');
const idl        = idlJson as Idl;
const coder      = new BorshCoder(idl);
const parser     = new EventParser(new PublicKey(Config.PROGRAM_ID), coder);

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
          
          // Notify admin via email
          await sendErrorNotification({
               signature: sig,
               errorName: errorName ?? 'UnknownError',
               slot,
               timestamp,
               logMessages
          });
          return;
     }     
     
     const events = [...parser.parseLogs(logMessages)];
     for (const e of events) {
          console.log(`✅ [${timestamp}] Event ${e.name} @${sig}`, e.data);
          const eventId = `${slot}-${sig}-${e.name}`;
          const safeData = serializeForDynamo(e.data);
          switch (e.name) {
               case EventType.FILLS_DEQUEUED:
                    const requester = safeData.requester;
                    const solDequeued = safeData.sol_dequeued;
                    const token2zDequeued = safeData.token_2z_dequeued;
                    const fillsConsumed = safeData.fills_consumed;
                    await writeFillDequeue(sig, eventId, requester, solDequeued, token2zDequeued, fillsConsumed, slot, timestamp);
                    break;
               case EventType.DENY_LIST_ADDRESS_ADDED:
                    const addedAddress = safeData.address;
                    const addedBy = safeData.added_by;
                    const addUpdateCount = safeData.update_count;
                    const addActionType = 'ADDED';
                    await writeDenyListAction(sig, eventId, addedAddress, addActionType, addedBy, addUpdateCount, slot, timestamp);
                    break;
               case EventType.DENY_LIST_ADDRESS_REMOVED:
                    const removedAddress = safeData.address;
                    const removedBy = safeData.removed_by;
                    const removeUpdateCount = safeData.update_count;
                    const removeActionType = 'REMOVED';
                    await writeDenyListAction(sig, eventId, removedAddress, removeActionType, removedBy, removeUpdateCount, slot, timestamp);
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

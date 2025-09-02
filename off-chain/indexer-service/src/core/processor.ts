import { Connection, PublicKey } from '@solana/web3.js';
import { BorshCoder, EventParser, Idl } from '@coral-xyz/anchor';
import idlJson from '../../idl/converter_program.json';

import { configUtil } from '../utils/configUtil';
import { EventType } from '../common';
import { writeSolanaEvent, writeFillDequeue, writeDenyListAction } from '../utils/ddb/events';
import { logger } from '../utils/logger';

const connection = new Connection(configUtil.getRpcUrl(), 'confirmed');
const idl        = idlJson as Idl;
const coder      = new BorshCoder(idl);
const parser     = new EventParser(new PublicKey(configUtil.getProgramId()), coder);

export async function processTx(sig: string) {
     const tx = await connection.getTransaction(sig, { commitment: 'confirmed' });
     if (!tx || !tx.meta) return;

     const slot      = tx.slot ?? 0;
     const secs      = tx.blockTime ?? (await connection.getBlockTime(slot));
     const timestamp = secs || 0;
     const logMessages = tx.meta.logMessages ?? [];
     const { err } = tx.meta;

     if (err) {
          logger.warn('Transaction failed', { 
               signature: sig, 
               timestamp, 
               error: err 
          });
          return;
     }     
     
     const events = [...parser.parseLogs(logMessages)];
     for (const e of events) {
          logger.info('Event processed', { 
               eventName: e.name, 
               signature: sig, 
               timestamp, 
               data: e.data 
          });
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

     // BN detection and conversion
     if (obj.constructor && obj.constructor.name === "BN" && typeof obj.toNumber === "function") {
          try {
               return obj.toNumber();
          } catch (error) {
               // If number is too large, convert to string
               return obj.toString();
          }
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

import { Connection } from '@solana/web3.js';
import { BorshCoder, EventParser, Idl } from '@coral-xyz/anchor';
import idlJson from '../../idl/converter_program.json';
import { saveLastSignature } from './state';
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
          const errorCode = JSON.stringify(err);
          console.error(`⛔ Failed tx ${sig}:`, JSON.stringify(err));
          // await writeSolanaError(sig, errorCode, logMessages, slot, timestamp);
        }
    
     const events = [...parser.parseLogs(logMessages)];
     for (const e of events) {
          console.log(`✅ [${timestamp}] Event ${e.name} @${sig}`, e.data);
          const eventId = `${slot}-${sig}-${e.name}`;
          switch (e.name) {
            case 'FillDequeued':
          //     await writeFillDequeue(sig, eventId, e.data, slot, timestamp);
              break;
            case 'DenyListModified':
          //     await writeDenyListAction(sig, eventId, e.data, slot, timestamp);
              break;
            default:
          //     await writeSolanaEvent(sig, eventId, e.name, e.data, slot, timestamp);
          }
        }

     await saveLastSignature(sig);
}
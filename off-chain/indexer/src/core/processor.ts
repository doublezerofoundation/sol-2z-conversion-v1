import { Connection, PublicKey, TransactionError } from '@solana/web3.js';
import { BorshCoder, EventParser, Idl } from '@coral-xyz/anchor';
import { saveLastSignature } from './state';
import { RPC_URL } from './config';
import { writeSolanaEvent, writeSolanaError, writeFillDequeue, writeDenyListAction } from '../utils/ddb';

const connection = new Connection(RPC_URL, 'confirmed');

export async function processTx(sig: string, programId: PublicKey, idl: Idl) {
     const tx = await connection.getTransaction(sig, { commitment: 'confirmed' });
     if (!tx || !tx.meta) return;

     const coder      = new BorshCoder(idl);
     const parser     = new EventParser(programId, coder);

     const slot      = tx.slot ?? 0;
     const secs      = tx.blockTime ?? (await connection.getBlockTime(slot));
     const timestamp = secs || 0;
     const logMessages = tx.meta.logMessages ?? [];
     const { err } = tx.meta;

     if (err) {
          const errorName = handleTxError(sig, idl, err);
          // await writeSolanaError(sig, errorName, slot, timestamp);
          return;
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

/**
 * Extracts Anchor custom error codes from a TransactionError
 * and logs a human‑readable message (falling back to raw error).
 */
function handleTxError(sig: string, idl: Idl, err: TransactionError): string | undefined {

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
          return undefined; // No custom error found, log raw error
     }
}

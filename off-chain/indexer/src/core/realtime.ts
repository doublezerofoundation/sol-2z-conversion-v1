import { Connection, Logs } from '@solana/web3.js';
import { RPC_URL, PROGRAM_ID } from './config';
import { processTx } from './processor';
import { getLastSignature, saveLastSignature, isRecovering} from './state';

/**
 * Subscribes to real-time logs for the program and processes new transactions.
 *
 * Listens via logsSubscribe
 * processes the transaction, and updates last Processed signature if recovery is done.
 */
export function tailRealTime() {
     console.log(`📡 Subscribing to logs for ${PROGRAM_ID.toBase58()}`);
     const connection = new Connection(RPC_URL, 'confirmed');
   
     connection.onLogs(
       PROGRAM_ID,
       async ({ signature: sig }: Logs) => {
         await processTx(sig);
   
         // only update cursor when recovery is done
         if (isRecovering()) return;
   
         const last = await getLastSignature();
         if (sig === last) return;
   
         // save the new cursor
         await saveLastSignature(sig);
       },
       'confirmed'
     );
   }

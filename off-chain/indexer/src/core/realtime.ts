import { Connection, Logs } from '@solana/web3.js';
import { RPC_URL, PROGRAMS } from './config';
import { processTx } from './processor';
import { getHighestSlot, saveHighestSlot } from './state';

/**
 * Subscribes to real-time logs for the program and processes new transactions.
 *
 * Listens via logsSubscribe, skips any slot ≤ highestSlot,
 * processes the transaction, and updates highestSlot to prevent duplicates.
 */
export function tailRealTime() {
     const connection = new Connection(RPC_URL, 'confirmed');
     for (const { id, idl } of PROGRAMS) {
          console.log(`📡 Subscribing to logs for ${id.toBase58()}`);
          connection.onLogs(
               // calls logsSubscribe under the hood
               id,
               async (logResponse: Logs, ctx) => {
                    const slot = (ctx as any).slot as number;
                    const highest = await getHighestSlot();
                    if (slot <= highest) return;

                    const sig = logResponse.signature;
                    await processTx(sig, id, idl);

                    await saveHighestSlot(slot);
               },
               'confirmed'
          );
     }
}

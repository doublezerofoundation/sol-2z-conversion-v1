import { Connection, Logs, PublicKey } from '@solana/web3.js';
import { processTx } from './processor';
import { getLastSignature, saveLastSignature, isRecovering} from './state';
import Config from '../utils/config';

/**
 * Subscribes to real-time logs for the program and processes new transactions.
 *
 * Listens via logsSubscribe
 * processes the transaction, and updates last Processed signature if recovery is done.
 */
export function tailRealTime() {
  console.log(`📡 Subscribing to logs for ${Config.PROGRAM_ID}`);
  const connection = new Connection(Config.RPC_URL, 'confirmed');
  const program_id = new PublicKey(Config.PROGRAM_ID);
  connection.onLogs(
    program_id,
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

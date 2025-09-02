import { Connection, Logs, PublicKey } from '@solana/web3.js';
import { processTx } from './processor';
import { getLastSignature, saveLastSignature, isRecovering} from './state';
import { configUtil } from '../utils/configUtil';
import { logger } from '../utils/logger';

/**
 * Subscribes to real-time logs for the program and processes new transactions.
 *
 * Listens via logsSubscribe
 * processes the transaction, and updates last Processed signature if recovery is done.
 */
export function tailRealTime() {
  logger.info('Subscribing to real-time logs', { programId: configUtil.getProgramId() });
  const connection = new Connection(configUtil.getRpcUrl(), 'confirmed');
  const program_id = new PublicKey(configUtil.getProgramId());
  connection.onLogs(
    program_id,
    async ({ signature: sig }: Logs) => {
      await processTx(sig);

      // only update cursor when recovery is done
      if (isRecovering()) return;

      // save the new cursor
      await saveLastSignature(sig);
    },
    'confirmed'
  );
}

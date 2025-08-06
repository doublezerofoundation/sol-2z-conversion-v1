import { recoverHistory } from './core/history';
import { tailRealTime } from './core/realtime';

/**
 * Bootstraps the indexer by starting the real-time log listener
 * and concurrently recovering historical transactions.
 *
 * This function invokes tailRealTime() immediately, then awaits recoverHistory()
 * to ensure no on-chain events are missed upon startup.
 */
(async () => {
  tailRealTime();
  await recoverHistory();    
})();
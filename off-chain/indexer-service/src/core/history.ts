import { Connection, PublicKey } from '@solana/web3.js';
import Config from '../utils/config';
import { getLastSignature, endRecovery } from './state';
import { promisePool } from '../utils/concurrency';
import { processTx } from './processor';
import { logger } from '../utils/logger';

export async function recoverHistory() {
  const program_id = new PublicKey(Config.PROGRAM_ID);
  const lastSig = await getLastSignature();
  if (!lastSig) {
    logger.info('No last signature found, skipping history recovery');
    endRecovery();
    return;
  }

  logger.info('Starting historical data recovery', { 
    lastSignature: lastSig,
    programId: Config.PROGRAM_ID 
  });

  const connection = new Connection(Config.RPC_URL, 'confirmed');
  let before: string | undefined;

  while (true) {
    const sigInfos = await connection.getSignaturesForAddress(
      program_id,
      { before,
        limit: 1000,
        until: lastSig ?? undefined,      // recovery will stop once it reaches this signature
      }
    );
    if (sigInfos.length === 0) {
      logger.debug('No more signatures found, ending history recovery');
      break;
    }

    logger.debug('Processing historical batch', { 
      batchSize: sigInfos.length, 
      beforeSignature: before 
    });

    // process all signatures
    await promisePool(
      sigInfos.map(i => i.signature),
      sig => processTx(sig),
      Config.CONCURRENCY!
    );

    // page backwards
    before = sigInfos[sigInfos.length - 1].signature;
  }

  logger.info('History recovery completed.');
  // enable real-time cursor 
  endRecovery();
}
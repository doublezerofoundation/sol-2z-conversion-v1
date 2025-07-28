import { Connection } from '@solana/web3.js';
import { RPC_URL, PROGRAMS, CONCURRENCY } from './config';
import { getLastSignature } from './state';
import { promisePool } from '../utils/concurrency';
import { processTx } from './processor';

/**
 * Recovers and processes all historical transactions for the program.
 *
 * Fetches batches of signatures starting from the lastProcessedSignature,
 * processes each transaction in chronological order with bounded concurrency,
 * and advances the cursor until there are no more historical signatures.
 */
export async function recoverHistory() {
  const connection = new Connection(RPC_URL!, 'confirmed');

  for (const { id, idl } of PROGRAMS) {
    let before = await getLastSignature(id) || undefined;
    console.log(`⏳ Recovering history for ${id.toBase58()} since: ${before ?? 'genesis'}`);

    while (true) {
      const sigInfos = await connection.getSignaturesForAddress(
        id,
        { before, limit: 1000 }
      );
      if (sigInfos.length === 0) break;

      const newBefore = sigInfos[sigInfos.length - 1].signature;
      const toProcess = [...sigInfos].reverse().map(i => i.signature);

      await promisePool(
        toProcess,
        async (sig: string) => await processTx(sig, id, idl),
        CONCURRENCY
      );
      before = newBefore;
    }
  }

  console.log('✅ History recovery complete');
}

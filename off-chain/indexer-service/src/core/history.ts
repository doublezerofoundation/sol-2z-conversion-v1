import { Connection } from '@solana/web3.js';
import { RPC_URL, PROGRAM_ID, CONCURRENCY } from './config';
import { getLastSignature, endRecovery } from './state';
import { promisePool } from '../utils/concurrency';
import { processTx } from './processor';

export async function recoverHistory() {

  const lastSig = await getLastSignature();
  console.log(`⏳ Catching up from tip down to last saved sig: ${lastSig || 'genesis'}`);

  const connection = new Connection(RPC_URL, 'confirmed');
  let before: string | undefined;

  while (true) {
    const sigInfos = await connection.getSignaturesForAddress(
      PROGRAM_ID,
      { before, limit: 1000 }
    );
    if (sigInfos.length === 0) break;

    const sigs = sigInfos.map(i => i.signature);
    const idx  = lastSig ? sigs.indexOf(lastSig) : -1;
    // if we found lastSig, only process everything before it
    const toProcess = idx >= 0 ? sigs.slice(0, idx) : sigs;

    await promisePool(
      toProcess,
      sig => processTx(sig),
      CONCURRENCY
    );

    if (idx >= 0) break;
    before = sigs[sigs.length - 1];
  }

  // enable real-time cursor 
  endRecovery();
  console.log('✅ History catch-up complete—now live logs will advance the cursor.');
}

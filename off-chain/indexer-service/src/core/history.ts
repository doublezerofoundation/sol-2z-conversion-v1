import { Connection } from '@solana/web3.js';
import { RPC_URL, PROGRAM_ID, CONCURRENCY } from './config';
import { getLastSignature, endRecovery } from './state';
import { promisePool } from '../utils/concurrency';
import { processTx } from './processor';

export async function recoverHistory() {

  const lastSig = await getLastSignature();
  if (!lastSig) {
    console.log('No last signature found, skipping history recovery.');
    endRecovery();
    return;
  }

  console.log(`⏳ Catching up from head down to last processed sig: ${lastSig}`);

  const connection = new Connection(RPC_URL, 'confirmed');
  let before: string | undefined;

  while (true) {
    const sigInfos = await connection.getSignaturesForAddress(
      PROGRAM_ID,
      { before,
        limit: 1000,
        until: lastSig ?? undefined,      // recovery will stop once it reaches this signature
      }
    );
    if (sigInfos.length === 0) break;

    // process all signatures
    await promisePool(
      sigInfos.map(i => i.signature),
      sig => processTx(sig),
      CONCURRENCY
    );

    // page backwards
    before = sigInfos[sigInfos.length - 1].signature;
  }

  // enable real-time cursor 
  endRecovery();
  console.log('✅ History recovery complete!');
}
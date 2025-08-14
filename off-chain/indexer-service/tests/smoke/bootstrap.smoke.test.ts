jest.mock('../../src/core/processor', () => require('../mock/processor'));
jest.mock('../../src/core/state',     () => require('../mock/state'));
jest.mock('../../src/utils/config',   () => require('../mock/config-util'));
jest.mock('@solana/web3.js',          () => require('../mock/web3'));

import { tailRealTime } from '../../src/core/realtime';
import { recoverHistory } from '../../src/core/history';
import { mockProcessTx } from '../mock/processor';
import { __setRecovering, __setLastSig, saveLastSignature } from '../mock/state';
import { __w3 } from '../mock/web3';

describe('bootstrap smoke flow', () => {
     beforeEach(() => {
          jest.clearAllMocks();
          __setRecovering(true);
          __setLastSig('L2'); // history should stop at this sig (server excludes it)
     });

     it('recovers without moving lastProcessedSignature, then realtime advances it', async () => {
          // Recovery pages (excludes L2)
          __w3.getSignaturesForAddress
               .mockResolvedValueOnce([{ signature: 'N3' }, { signature: 'N2' }])
               .mockResolvedValueOnce([{ signature: 'N1' }])
               .mockResolvedValueOnce([]); // end

          // Capture onLogs callback
          let onLogsCb: any;
          __w3.onLogs.mockImplementation((_pk, cb) => { onLogsCb = cb; return 1; });

          // Start realtime, run recovery
          tailRealTime();
          await recoverHistory(); // will call endRecovery() under the hood

          // Recovery processed pages, but did NOT persist lastProcessedSignature
          expect(mockProcessTx.mock.calls.flat()).toEqual(['N3', 'N2', 'N1']);
          expect(saveLastSignature).not.toHaveBeenCalled();

          // Now a live tx arrives, lastProcessedSignature should advance
          await onLogsCb({ signature: 'LIVE1' });
          expect(mockProcessTx).toHaveBeenCalledWith('LIVE1');
          expect(saveLastSignature).toHaveBeenCalledWith('LIVE1');
     });
});

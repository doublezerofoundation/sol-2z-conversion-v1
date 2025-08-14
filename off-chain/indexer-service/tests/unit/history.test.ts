jest.mock('../../src/core/processor', () => require('../mock/processor'));
jest.mock('../../src/core/state',     () => require('../mock/state'));
jest.mock('../../src/utils/config',   () => require('../mock/config-util'));
jest.mock('@solana/web3.js',          () => require('../mock/web3'));

import { recoverHistory } from '../../src/core/history';
import { mockProcessTx } from '../mock/processor';
import { __setLastSig } from '../mock/state';
import { endRecovery } from '../../src/core/state';
import { __w3 } from '../mock/web3';

describe('recoverHistory', () => {
     beforeEach(() => {
          jest.clearAllMocks();
     });

     it('pages newest to older, processes all, ends recovery', async () => {
          __setLastSig('L2');

          // Since until is set, L2 is excluded by server.
          __w3.getSignaturesForAddress
               .mockResolvedValueOnce([{ signature: 'N5' }, { signature: 'N4' }, { signature: 'N3' }])
               .mockResolvedValueOnce([{ signature: 'N2' }, { signature: 'N1' }])
               .mockResolvedValueOnce([]); // done

          await recoverHistory();

          expect(mockProcessTx.mock.calls.flat()).toEqual(['N5', 'N4', 'N3', 'N2', 'N1']);
          expect(endRecovery).toHaveBeenCalledTimes(1);
     });

     it('skips when no last signature; still ends recovery', async () => {
          __setLastSig(null);

          await recoverHistory();

          expect(mockProcessTx).not.toHaveBeenCalled();
          expect(endRecovery).toHaveBeenCalledTimes(1);
     });
});

jest.mock('../../src/core/processor', () => require('../mock/processor'));
jest.mock('../../src/core/state',     () => require('../mock/state'));
jest.mock('../../src/utils/config',   () => require('../mock/config-util'));
jest.mock('@solana/web3.js',          () => require('../mock/web3'));

import { tailRealTime } from '../../src/core/realtime';
import { mockProcessTx } from '../mock/processor';
import { __setRecovering, __setLastSig, saveLastSignature } from '../mock/state';
import { __w3 } from '../mock/web3';

describe('tailRealTime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setRecovering(true);
    __setLastSig(null);
  });

  it('during recovery: processes but does not persist lastProcessedSignature', async () => {
    // capture the onLogs callback
    let onLogsCb: any;
    __w3.onLogs.mockImplementation((_pk, cb) => { onLogsCb = cb; return 1; });

    tailRealTime();
    await onLogsCb({ signature: 'S1' });

    expect(mockProcessTx).toHaveBeenCalledWith('S1');
    expect(saveLastSignature).not.toHaveBeenCalled();
  });

  it('after recovery: processes and persists lastProcessedSignature; skips duplicate persist', async () => {
    __setRecovering(false);
    __setLastSig('S0');

    let onLogsCb: any;
    __w3.onLogs.mockImplementation((_pk, cb) => { onLogsCb = cb; return 1; });

    tailRealTime();
    await onLogsCb({ signature: 'S1' });
    expect(mockProcessTx).toHaveBeenCalledWith('S1');
    expect(saveLastSignature).toHaveBeenCalledWith('S1');

    jest.clearAllMocks();
    __setLastSig('S1');
    await onLogsCb({ signature: 'S1' });
    expect(mockProcessTx).toHaveBeenCalledWith('S1'); // still processes
    expect(saveLastSignature).not.toHaveBeenCalled(); // but no lastProcessedSignature update
  });
});

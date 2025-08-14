jest.mock('../../src/utils/config',   () => require('../mock/config-util'));
jest.mock('../../src/utils/ddb',      () => require('../mock/ddb-util'));
jest.mock('@solana/web3.js',          () => require('../mock/web3'));

// Silence Anchor event parsing. cause we only test error path here.
jest.mock('@coral-xyz/anchor', () => ({
     BorshCoder: jest.fn(),
     EventParser: jest.fn().mockImplementation(() => ({ parseLogs: function* () {} })),
}));

import { processTx } from '../../src/core/processor';
import { __w3 } from '../mock/web3';
import { writeSolanaError } from '../mock/ddb-util';

describe('processTx (error path)', () => {
     beforeEach(() => {
          jest.clearAllMocks();
          __w3.getTransaction.mockResolvedValue({
               slot: 1,
               blockTime: 123,
               meta: { err: { InstructionError: [0, { Custom: 6000 }] }, logMessages: ['log'] },
          });
     });

     it('writes an error row for a failed tx', async () => {
          await processTx('SIG_ERR');

          expect(writeSolanaError).toHaveBeenCalledTimes(1);
          const [txHash, errorCode, logs, slot, ts] = writeSolanaError.mock.calls[0];

          expect(txHash).toBe('SIG_ERR');
          expect(typeof errorCode).toBe('string');
          expect(Array.isArray(logs)).toBe(true);
          expect(typeof slot).toBe('number');
          expect(typeof ts).toBe('number');
     });

     it('does not write an error row for a successful tx', async () => {
          __w3.getTransaction.mockResolvedValue({
               slot: 1,
               blockTime: 123,
               meta: { err: null, logMessages: ['log'] },
          });

          await processTx('SIG_OK');

          expect(writeSolanaError).not.toHaveBeenCalled();
     });
});

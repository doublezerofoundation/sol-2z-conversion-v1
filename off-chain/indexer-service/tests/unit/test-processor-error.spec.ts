import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import proxyquire from 'proxyquire';
import { stub, restore } from 'sinon';
import { createProcessorMocks } from '../utils/test-helper';

describe('Transaction process error path tests', () => {
  let processTx: any;
  let writeSolanaErrorStub: sinon.SinonStub;
  let sendErrorNotificationStub: sinon.SinonStub;
  let getTransactionStub: sinon.SinonStub;

  beforeEach(() => {
    // Create stubs
    writeSolanaErrorStub = stub();
    sendErrorNotificationStub = stub();
    getTransactionStub = stub();

    // Default behavior for error transaction
    getTransactionStub.resolves({
      slot: 1,
      blockTime: 123,
      meta: { err: { InstructionError: [0, { Custom: 6000 }] }, logMessages: ['log'] },
    });

    // Create mocks using shared utility
    const mocks = createProcessorMocks({
      writeSolanaError: writeSolanaErrorStub,
      sendErrorNotification: sendErrorNotificationStub,
      getTransactionStub: getTransactionStub
    });

    // Import the processor with mocked dependencies
    const processorModule = proxyquire('../../src/core/processor', mocks);
    processTx = processorModule.processTx;
  });

  afterEach(() => {
      restore();
  });

  it('writes an error row for a failed tx', async () => {
    await processTx('SIG_ERR');

    expect(writeSolanaErrorStub.calledOnce).to.be.true;
    const callArgs = writeSolanaErrorStub.getCall(0).args;
    const [txHash, errorCode, logs, slot, ts] = callArgs;

    expect(txHash).to.equal('SIG_ERR');
    expect(typeof errorCode).to.equal('string');
    expect(Array.isArray(logs)).to.be.true;
    expect(typeof slot).to.equal('number');
    expect(typeof ts).to.equal('number');

    // Verify email notification was sent
    expect(sendErrorNotificationStub.calledOnce).to.be.true;
    const notificationData = sendErrorNotificationStub.getCall(0).args[0];
    expect(notificationData.signature).to.equal('SIG_ERR');
    expect(notificationData.errorName).to.equal(errorCode);
    expect(notificationData.slot).to.equal(slot);
    expect(notificationData.timestamp).to.equal(ts);
    expect(notificationData.logMessages).to.deep.equal(logs);
  });

  it('does not write an error row for a successful tx', async () => {
    getTransactionStub.resolves({
      slot: 1,
      blockTime: 123,
      meta: { err: null, logMessages: ['log'] },
    });

    await processTx('SIG_OK');

    expect(writeSolanaErrorStub.called).to.be.false;
    expect(sendErrorNotificationStub.called).to.be.false;
  });
});

import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import * as proxyquire from 'proxyquire';
import * as sinon from 'sinon';

describe('processTx (error path) - Mocha', () => {
  let processTx: any;
  let writeSolanaErrorStub: sinon.SinonStub;
  let sendErrorNotificationStub: sinon.SinonStub;
  let getTransactionStub: sinon.SinonStub;

  beforeEach(() => {
    // Create stubs
    writeSolanaErrorStub = sinon.stub();
    sendErrorNotificationStub = sinon.stub();
    getTransactionStub = sinon.stub();

    // Default behavior for error transaction
    getTransactionStub.resolves({
      slot: 1,
      blockTime: 123,
      meta: { err: { InstructionError: [0, { Custom: 6000 }] }, logMessages: ['log'] },
    });

    // Create a mock connection class
    class MockConnection {
      getTransaction = getTransactionStub;
    }

    // Import the processor with mocked dependencies
    const processorModule = proxyquire.load('../../src/core/processor', {
      '../utils/config': require('../mock/config-util'),
      '../utils/ddb/events': {
        writeSolanaError: writeSolanaErrorStub,
        writeSolanaEvent: sinon.stub(),
        writeFillDequeue: sinon.stub(),
        writeDenyListAction: sinon.stub(),
        '@noCallThru': true
      },
      '../utils/notifications': {
        sendErrorNotification: sendErrorNotificationStub,
        '@noCallThru': true
      },
      '@solana/web3.js': {
        Connection: MockConnection,
        PublicKey: sinon.stub(),
        '@noCallThru': true
      },
      '@coral-xyz/anchor': {
        BorshCoder: sinon.stub(),
        EventParser: sinon.stub().returns({ parseLogs: function* () {} }),
        '@noCallThru': true
      },
    });

    processTx = processorModule.processTx;
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

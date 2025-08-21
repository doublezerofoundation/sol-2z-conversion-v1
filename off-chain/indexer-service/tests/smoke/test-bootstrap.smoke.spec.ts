import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { stub, restore } from 'sinon';
import proxyquire from 'proxyquire';
import { createRealtimeMocks, createHistoryMocks } from '../utils/test-helper';

describe('bootstrap smoke flow', () => {
    let tailRealTime: any;
    let recoverHistory: any;
    let processTxStub: sinon.SinonStub;
    let getLastSignatureStub: sinon.SinonStub;
    let saveLastSignatureStub: sinon.SinonStub;
    let isRecoveringStub: sinon.SinonStub;
    let endRecoveryStub: sinon.SinonStub;
    let getSignaturesForAddressStub: sinon.SinonStub;
    let onLogsStub: sinon.SinonStub;
    let consoleLogStub: sinon.SinonStub;
    let capturedOnLogsCallback: any;

     beforeEach(() => {
          // Create stubs for all dependencies
          processTxStub = stub();
          getLastSignatureStub = stub();
          saveLastSignatureStub = stub();
          isRecoveringStub = stub();
          endRecoveryStub = stub();
          getSignaturesForAddressStub = stub();
          onLogsStub = stub();
          consoleLogStub = stub(console, 'log');

          // Setup default state
          processTxStub.resolves();
          saveLastSignatureStub.resolves();
          endRecoveryStub.returns(undefined);

          // Capture the onLogs callback when it's registered
          onLogsStub.callsFake((programId: any, callback: any, commitment: string) => {
               capturedOnLogsCallback = callback;
               return 1; // Mock subscription ID
          });

          // Create mocks using shared utilities
          const realtimeMocks = createRealtimeMocks({
               processTx: processTxStub,
               getLastSignature: getLastSignatureStub,
               saveLastSignature: saveLastSignatureStub,
               isRecovering: isRecoveringStub,
               onLogsStub: onLogsStub
          });

          const historyMocks = createHistoryMocks({
               getLastSignature: getLastSignatureStub,
               endRecovery: endRecoveryStub,
               processTx: processTxStub,
               getSignaturesForAddressStub: getSignaturesForAddressStub
          });

          // Load both realtime and history modules with shared mocked dependencies
          const realtimeModule = proxyquire('../../src/core/realtime', realtimeMocks);
          const historyModule = proxyquire('../../src/core/history', historyMocks);

          tailRealTime = realtimeModule.tailRealTime;
          recoverHistory = historyModule.recoverHistory;
     });

     afterEach(() => {
          restore();
     });

     it('should recover history without moving lastProcessedSignature, then realtime should advance it', async () => {
          // Setup: System starts in recovery mode with last signature L2
          getLastSignatureStub.resolves('L2');
          isRecoveringStub.returns(true); // Initially in recovery

          // Mock paginated responses for history recovery (excludes L2 as expected)
          getSignaturesForAddressStub
               .onCall(0).resolves([
                    { signature: 'N3' }, 
                    { signature: 'N2' }
               ])
               .onCall(1).resolves([
                    { signature: 'N1' }
               ])
               .onCall(2).resolves([]); // End pagination

          // Start bootstrap process
          tailRealTime();
          await recoverHistory();

          // Verify history recovery processed all signatures in correct order
          expect(processTxStub.callCount).to.equal(3);
          expect(processTxStub.getCall(0).calledWith('N3')).to.be.true;
          expect(processTxStub.getCall(1).calledWith('N2')).to.be.true;
          expect(processTxStub.getCall(2).calledWith('N1')).to.be.true;

          // Verify recovery did NOT save lastProcessedSignature (during recovery)
          expect(saveLastSignatureStub.called).to.be.false;

          // Verify endRecovery was called to complete recovery phase
          expect(endRecoveryStub.calledOnce).to.be.true;

          // Reset stubs for real-time phase
          processTxStub.resetHistory();
          isRecoveringStub.returns(false); // Recovery is now complete
          getLastSignatureStub.resolves('L2'); // Still the same last signature

          // Simulate a live transaction arriving via real-time subscription
          await capturedOnLogsCallback({ signature: 'LIVE1' });

          // Verify live transaction was processed
          expect(processTxStub.calledOnce).to.be.true;
          expect(processTxStub.calledWith('LIVE1')).to.be.true;

          // Verify lastProcessedSignature was updated (recovery is complete, signature is different)
          expect(saveLastSignatureStub.calledOnce).to.be.true;
          expect(saveLastSignatureStub.calledWith('LIVE1')).to.be.true;
     });

     it('should handle the complete bootstrap flow with multiple live transactions', async () => {
          // Setup initial state
          getLastSignatureStub.resolves('L2');
          isRecoveringStub.returns(true);

          // Mock history recovery with more complex pagination
          getSignaturesForAddressStub
               .onCall(0).resolves([
                    { signature: 'N5' }, 
                    { signature: 'N4' },
                    { signature: 'N3' }
               ])
               .onCall(1).resolves([
                    { signature: 'N2' }, 
                    { signature: 'N1' }
               ])
               .onCall(2).resolves([]); // End

          // Start bootstrap process
          tailRealTime();
          await recoverHistory();

          // Verify all historical transactions were processed
          expect(processTxStub.callCount).to.equal(5);
          const historicalSigs = processTxStub.getCalls().map(call => call.args[0]);
          expect(historicalSigs).to.deep.equal(['N5', 'N4', 'N3', 'N2', 'N1']);

          // Verify no signature saving during recovery
          expect(saveLastSignatureStub.called).to.be.false;

          // Switch to post-recovery mode
          processTxStub.resetHistory();
          isRecoveringStub.returns(false);

          // Simulate multiple live transactions
          getLastSignatureStub.resolves('L2'); // Initial state

          await capturedOnLogsCallback({ signature: 'LIVE1' });
          expect(processTxStub.calledWith('LIVE1')).to.be.true;
          expect(saveLastSignatureStub.calledWith('LIVE1')).to.be.true;

          // Update mock to return new last signature
          processTxStub.resetHistory();
          saveLastSignatureStub.resetHistory();
          getLastSignatureStub.resolves('LIVE1');

          await capturedOnLogsCallback({ signature: 'LIVE2' });
          expect(processTxStub.calledWith('LIVE2')).to.be.true;
          expect(saveLastSignatureStub.calledWith('LIVE2')).to.be.true;

          // Test duplicate signature handling
          processTxStub.resetHistory();
          saveLastSignatureStub.resetHistory();
          getLastSignatureStub.resolves('LIVE2'); // Same as incoming

          await capturedOnLogsCallback({ signature: 'LIVE2' });
          expect(processTxStub.calledWith('LIVE2')).to.be.true; // Still processes
          expect(saveLastSignatureStub.called).to.be.false; // But doesn't save duplicate
     });

     it('should handle bootstrap flow when no history exists', async () => {
          // Setup: No last signature (fresh start)
          getLastSignatureStub.resolves(null);
          isRecoveringStub.returns(true);

          // Start bootstrap
          tailRealTime();
          await recoverHistory(); // Should skip history recovery

          // Verify no history processing occurred
          expect(getSignaturesForAddressStub.called).to.be.false;
          expect(processTxStub.called).to.be.false;

          // Verify recovery was still ended
          expect(endRecoveryStub.calledOnce).to.be.true;

          // Switch to real-time mode
          isRecoveringStub.returns(false);
          getLastSignatureStub.resolves(null);

          // Process first live transaction
          await capturedOnLogsCallback({ signature: 'FIRST' });

          expect(processTxStub.calledWith('FIRST')).to.be.true;
          expect(saveLastSignatureStub.calledWith('FIRST')).to.be.true;
     });

     it('should handle errors during bootstrap flow gracefully', async () => {
          // Setup recovery state
          getLastSignatureStub.resolves('L2');
          isRecoveringStub.returns(true);

          getSignaturesForAddressStub
               .onCall(0).resolves([{ signature: 'N1' }])
               .onCall(1).resolves([]);

          // Mock processTx to fail during history recovery
          const processingError = new Error('Processing failed');
          processTxStub.rejects(processingError);

          tailRealTime();

          // History recovery should propagate the error
          try {
               await recoverHistory();
               expect.fail('Should have thrown an error');
          } catch (error) {
               expect(error).to.equal(processingError);
          }

          // Verify processing was attempted
          expect(processTxStub.calledWith('N1')).to.be.true;
          
          // Verify endRecovery was not called due to error
          expect(endRecoveryStub.called).to.be.false;
     });
});

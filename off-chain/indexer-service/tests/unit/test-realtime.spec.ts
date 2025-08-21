import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { stub, restore } from 'sinon';
import proxyquire from 'proxyquire';
import { createRealtimeMocks } from '../utils/test-helper';

describe('tailRealTime', () => {
    let processTxStub: sinon.SinonStub;
    let getLastSignatureStub: sinon.SinonStub;
    let saveLastSignatureStub: sinon.SinonStub;
    let isRecoveringStub: sinon.SinonStub;
    let onLogsStub: sinon.SinonStub;
    let consoleLogStub: sinon.SinonStub;
    let tailRealTime: any;
    let capturedOnLogsCallback: any;

     beforeEach(() => {
          // Create stubs for all dependencies
          processTxStub = stub();
          getLastSignatureStub = stub();
          saveLastSignatureStub = stub();
          isRecoveringStub = stub();
          onLogsStub = stub();
          consoleLogStub = stub(console, 'log');

          // Capture the onLogs callback when it's registered
          onLogsStub.callsFake((programId: any, callback: any, commitment: string) => {
               capturedOnLogsCallback = callback;
               return 1; // Mock subscription ID
          });

          // Create mocks using shared utility
          const mocks = createRealtimeMocks({
               processTx: processTxStub,
               getLastSignature: getLastSignatureStub,
               saveLastSignature: saveLastSignatureStub,
               isRecovering: isRecoveringStub,
               onLogsStub: onLogsStub
          });

          // Load the module with mocked dependencies 
          const realtimeModule = proxyquire('../../src/core/realtime', mocks);
          tailRealTime = realtimeModule.tailRealTime;
     });

     afterEach(() => {
          restore();
     });

     it('should process transactions but not persist signature during recovery', async () => {
          // Setup: System is in recovery mode
          isRecoveringStub.returns(true);
          processTxStub.resolves();

          // Execute: Start real-time monitoring
          tailRealTime();

          // Verify onLogs subscription
          expect(onLogsStub.calledOnce).to.be.true;
          expect(onLogsStub.args[0][2]).to.equal('confirmed'); // commitment level

          // Simulate a log event
          const mockLogEvent = { signature: 'S1' };
          await capturedOnLogsCallback(mockLogEvent);

          // Verify transaction was processed
          expect(processTxStub.calledOnce).to.be.true;
          expect(processTxStub.calledWith('S1')).to.be.true;

          // Verify signature was NOT saved during recovery
          expect(saveLastSignatureStub.called).to.be.false;
          expect(getLastSignatureStub.called).to.be.false;
     });

     it('should process and persist signature after recovery, but skip duplicate persist', async () => {
          // Setup: Recovery is complete
          isRecoveringStub.returns(false);
          getLastSignatureStub.resolves('S0'); // Previous signature
          processTxStub.resolves();
          saveLastSignatureStub.resolves();

          // Execute: Start real-time monitoring
          tailRealTime();

          // Simulate a new log event with different signature
          const mockLogEvent = { signature: 'S1' };
          await capturedOnLogsCallback(mockLogEvent);

          // Verify transaction was processed
          expect(processTxStub.calledOnce).to.be.true;
          expect(processTxStub.calledWith('S1')).to.be.true;

          // Verify signature was saved (not during recovery and different from last)
          expect(getLastSignatureStub.calledOnce).to.be.true;
          expect(saveLastSignatureStub.calledOnce).to.be.true;
          expect(saveLastSignatureStub.calledWith('S1')).to.be.true;

          // Reset for duplicate test
          processTxStub.resetHistory();
          saveLastSignatureStub.resetHistory();
          getLastSignatureStub.resetHistory();

          // Setup: Last signature is now S1 (same as incoming)
          getLastSignatureStub.resolves('S1');

          // Simulate same signature again
          await capturedOnLogsCallback({ signature: 'S1' });

          // Verify transaction was still processed
          expect(processTxStub.calledOnce).to.be.true;
          expect(processTxStub.calledWith('S1')).to.be.true;

          // Verify signature was NOT saved (duplicate)
          expect(getLastSignatureStub.calledOnce).to.be.true;
          expect(saveLastSignatureStub.called).to.be.false;
     });

     it('should handle processing errors gracefully', async () => {
          // Setup: Recovery is complete
          isRecoveringStub.returns(false);
          getLastSignatureStub.resolves('S0');
          saveLastSignatureStub.resolves();

          // Mock processTx to throw an error
          const testError = new Error('Processing failed');
          processTxStub.rejects(testError);

          // Execute: Start real-time monitoring
          tailRealTime();

          // Simulate a log event that will cause processing error
          const mockLogEvent = { signature: 'S1' };
          
          // The error should be thrown when the callback is executed
          try {
               await capturedOnLogsCallback(mockLogEvent);
               expect.fail('Should have thrown an error');
          } catch (error) {
               expect(error).to.equal(testError);
          }

          // Verify processTx was called
          expect(processTxStub.calledOnce).to.be.true;
          expect(processTxStub.calledWith('S1')).to.be.true;

          // Verify signature save was not attempted due to error
          expect(getLastSignatureStub.called).to.be.false;
          expect(saveLastSignatureStub.called).to.be.false;
     });

     it('should handle saveLastSignature errors gracefully', async () => {
          // Setup: Recovery is complete
          isRecoveringStub.returns(false);
          getLastSignatureStub.resolves('S0');
          processTxStub.resolves();

          // Mock saveLastSignature to throw an error
          const saveError = new Error('Save failed');
          saveLastSignatureStub.rejects(saveError);

          // Execute: Start real-time monitoring
          tailRealTime();

          // Simulate a log event
          const mockLogEvent = { signature: 'S1' };
          
          // The error should be thrown when the callback tries to save
          try {
               await capturedOnLogsCallback(mockLogEvent);
               expect.fail('Should have thrown an error');
          } catch (error) {
               expect(error).to.equal(saveError);
          }

          // Verify processTx was called successfully
          expect(processTxStub.calledOnce).to.be.true;
          expect(processTxStub.calledWith('S1')).to.be.true;

          // Verify getLastSignature was called
          expect(getLastSignatureStub.calledOnce).to.be.true;

          // Verify saveLastSignature was attempted
          expect(saveLastSignatureStub.calledOnce).to.be.true;
          expect(saveLastSignatureStub.calledWith('S1')).to.be.true;
     });

     it('should properly setup connection with correct parameters', () => {
          // Execute: Start real-time monitoring
          tailRealTime();

          // Verify onLogs subscription setup
          expect(onLogsStub.calledOnce).to.be.true;
          
          const onLogsArgs = onLogsStub.args[0];
          expect(onLogsArgs[0]).to.be.instanceOf(Object); // PublicKey instance
          expect(typeof onLogsArgs[1]).to.equal('function'); // callback function
          expect(onLogsArgs[2]).to.equal('confirmed'); // commitment level
     });
});

import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { stub, restore } from 'sinon';
import proxyquire from 'proxyquire';
import { createHistoryMocks } from '../utils/test-helper';

describe('recoverHistory', () => {
    let getLastSignatureStub: sinon.SinonStub;
    let endRecoveryStub: sinon.SinonStub;
    let processTxStub: sinon.SinonStub;
    let getSignaturesForAddressStub: sinon.SinonStub;
    let consoleLogStub: sinon.SinonStub;
    let recoverHistory: any;

     beforeEach(() => {
          // Create stubs for all dependencies
          getLastSignatureStub = stub();
          endRecoveryStub = stub();
          processTxStub = stub();
          getSignaturesForAddressStub = stub();
          consoleLogStub = stub(console, 'log');

          // Create mocks using shared utility
          const mocks = createHistoryMocks({
               getLastSignature: getLastSignatureStub,
               endRecovery: endRecoveryStub,
               processTx: processTxStub,
               getSignaturesForAddressStub: getSignaturesForAddressStub
          });

          // Load the module with mocked dependencies
          const historyModule = proxyquire('../../src/core/history', mocks);
          recoverHistory = historyModule.recoverHistory;
     });

     afterEach(() => {
          restore();
     });

     it('should page from newest to older, process all signatures, and end recovery', async () => {
          // Setup: Mock last signature
          getLastSignatureStub.resolves('L2');

          // Mock paginated responses from getSignaturesForAddress
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
               .onCall(2).resolves([]); // Empty array to end pagination

          // Mock successful processing
          processTxStub.resolves();

          // Execute the function
          await recoverHistory();

          // Verify getSignaturesForAddress calls
          expect(getSignaturesForAddressStub.callCount).to.equal(3);
          
          // First call should have before=undefined, until=L2
          const firstCall = getSignaturesForAddressStub.getCall(0);
          expect(firstCall.args[1].until).to.equal('L2');
          expect(firstCall.args[1].before).to.be.undefined;
          expect(firstCall.args[1].limit).to.equal(1000);

          // Second call should have before=N3 (last signature from first batch)
          const secondCall = getSignaturesForAddressStub.getCall(1);
          expect(secondCall.args[1].before).to.equal('N3');
          expect(secondCall.args[1].until).to.equal('L2');

          // Third call should have before=N1 (last signature from second batch)
          const thirdCall = getSignaturesForAddressStub.getCall(2);
          expect(thirdCall.args[1].before).to.equal('N1');
          expect(thirdCall.args[1].until).to.equal('L2');

          // Verify all signatures were processed in the correct order
          expect(processTxStub.callCount).to.equal(5);
          expect(processTxStub.getCall(0).calledWith('N5')).to.be.true;
          expect(processTxStub.getCall(1).calledWith('N4')).to.be.true;
          expect(processTxStub.getCall(2).calledWith('N3')).to.be.true;
          expect(processTxStub.getCall(3).calledWith('N2')).to.be.true;
          expect(processTxStub.getCall(4).calledWith('N1')).to.be.true;

          // Verify recovery was ended
          expect(endRecoveryStub.calledOnce).to.be.true;

     });

     it('should skip processing when no last signature exists and still end recovery', async () => {
          // Setup: No last signature
          getLastSignatureStub.resolves(null);

          // Execute the function
          await recoverHistory();

          // Verify no signatures were fetched or processed
          expect(getSignaturesForAddressStub.called).to.be.false;
          expect(processTxStub.called).to.be.false;

          // Verify recovery was still ended
          expect(endRecoveryStub.calledOnce).to.be.true;

     });

     it('should handle empty response on first call', async () => {
          // Setup: Mock last signature
          getLastSignatureStub.resolves('L2');

          // Mock empty response on first call
          getSignaturesForAddressStub.resolves([]);

          // Execute the function
          await recoverHistory();

          // Verify only one call to getSignaturesForAddress
          expect(getSignaturesForAddressStub.callCount).to.equal(1);

          // Verify no processing occurred
          expect(processTxStub.called).to.be.false;

          // Verify recovery was ended
          expect(endRecoveryStub.calledOnce).to.be.true;
     });

     it('should handle processing errors gracefully', async () => {
          // Setup: Mock last signature
          getLastSignatureStub.resolves('L2');

          // Mock response with signatures
          getSignaturesForAddressStub
               .onCall(0).resolves([{ signature: 'N1' }])
               .onCall(1).resolves([]);

          // Mock processTx to throw an error
          const testError = new Error('Processing failed');
          processTxStub.rejects(testError);

          // Execute and expect error to be thrown
          try {
               await recoverHistory();
               expect.fail('Should have thrown an error');
          } catch (error) {
               expect(error).to.equal(testError);
          }

          // Verify processTx was called
          expect(processTxStub.calledOnce).to.be.true;
          expect(processTxStub.calledWith('N1')).to.be.true;

          // Verify endRecovery was not called due to error
          expect(endRecoveryStub.called).to.be.false;
     });
});

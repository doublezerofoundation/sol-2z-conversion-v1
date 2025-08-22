import { SinonStub, stub } from 'sinon';

/**
 * Shared MockConnection class for Solana connection testing
 */
export class MockConnection {
     public getTransaction?: SinonStub;
     public getSignaturesForAddress?: SinonStub;
     public onLogs?: SinonStub;
     public getBlockTime?: SinonStub;

     constructor(rpcUrl: string, commitment: string, stubs?: Partial<MockConnection>) {
          // Only assign stubs that are provided
          if (stubs?.getTransaction) this.getTransaction = stubs.getTransaction;
          if (stubs?.getSignaturesForAddress) this.getSignaturesForAddress = stubs.getSignaturesForAddress;
          if (stubs?.onLogs) this.onLogs = stubs.onLogs;
          if (stubs?.getBlockTime) this.getBlockTime = stubs.getBlockTime;
     }
}

/**
 * Mock PublicKey class for testing
 */
export class MockPublicKey {
     constructor(public key: string) {}
     
     toString() {
          return this.key;
     }
}

/**
 * Mock EventParser class for testing
 */
export class MockEventParser {
     public parseLogs: SinonStub;
     
     constructor(programId: any, coder: any, parseLogsStub: SinonStub) {
          this.parseLogs = parseLogsStub;
     }
}

/**
 * Simple implementation of promisePool for testing
 * Processes items sequentially to maintain predictable test behavior
 */
export async function mockPromisePool<T>(
    items: T[], 
    processor: (item: T) => Promise<void>, 
    concurrency: number
): Promise<void> {
    // Simple implementation that calls processor for each item
    for (const item of items) {
        await processor(item);
    }
}

/**
 * Creates standard mock dependencies object for processor tests
 */
export function createProcessorMocks(stubs: {
    writeSolanaError?: SinonStub;
    writeSolanaEvent?: SinonStub;
    writeFillDequeue?: SinonStub;
    writeDenyListAction?: SinonStub;
    sendErrorNotification?: SinonStub;
    getTransactionStub?: SinonStub;
    getBlockTimeStub?: SinonStub;
    parseLogsStub?: SinonStub;
}) {
     return {
          '../utils/config': require('../mock/config-util'),
          '../utils/ddb/events': {
               writeSolanaError: stubs.writeSolanaError || stub(),
               writeSolanaEvent: stubs.writeSolanaEvent || stub(),
               writeFillDequeue: stubs.writeFillDequeue || stub(),
               writeDenyListAction: stubs.writeDenyListAction || stub(),
               '@noCallThru': true
          },
          '../utils/notifications': {
               sendErrorNotification: stubs.sendErrorNotification || stub(),
               '@noCallThru': true
          },
          '@solana/web3.js': {
               Connection: function(rpcUrl: string, commitment: string) {
                    return new MockConnection(rpcUrl, commitment, {
                         getTransaction: stubs.getTransactionStub,
                         getBlockTime: stubs.getBlockTimeStub
                    });
               },
               PublicKey: MockPublicKey,
               '@noCallThru': true
          },
          '@coral-xyz/anchor': {
               BorshCoder: stub(),
               EventParser: function(programId: any, coder: any) {
                    return new MockEventParser(programId, coder, stubs.parseLogsStub || stub().returns([]));
               },
               '@noCallThru': true
          }
     };
}

/**
 * Creates standard mock dependencies for realtime tests
 */
export function createRealtimeMocks(stubs: {
    processTx?: SinonStub;
    getLastSignature?: SinonStub;
    saveLastSignature?: SinonStub;
    isRecovering?: SinonStub;
    onLogsStub?: SinonStub;
}) {
     return {
          '@solana/web3.js': {
               Connection: function(rpcUrl: string, commitment: string) {
                    return new MockConnection(rpcUrl, commitment, {
                         onLogs: stubs.onLogsStub
                    });
               },
               PublicKey: MockPublicKey
          },
          './processor': {
               processTx: stubs.processTx || stub()
          },
          './state': {
               getLastSignature: stubs.getLastSignature || stub(),
               saveLastSignature: stubs.saveLastSignature || stub(),
               isRecovering: stubs.isRecovering || stub()
          },
          '../utils/config': require('../mock/config-util'),
     };
}

/**
 * Creates standard mock dependencies for history tests
 */
export function createHistoryMocks(stubs: {
    getLastSignature?: SinonStub;
    endRecovery?: SinonStub;
    processTx?: SinonStub;
    getSignaturesForAddressStub?: SinonStub;
}) {
     return {
          '@solana/web3.js': {
               Connection: function(rpcUrl: string, commitment: string) {
                    return new MockConnection(rpcUrl, commitment, {
                         getSignaturesForAddress: stubs.getSignaturesForAddressStub
                    });
               },
               PublicKey: MockPublicKey
          },
          '../utils/config': require('../mock/config-util'),
          './state': {
               getLastSignature: stubs.getLastSignature || stub(),
               endRecovery: stubs.endRecovery || stub()
          },
          './processor': {
               processTx: stubs.processTx || stub()
          },
          '../utils/concurrency': {
               promisePool: mockPromisePool
          }
     };
}

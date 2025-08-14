// Mock for: src/utils/ddb.ts

export const writeSolanaEvent = jest.fn();
export const writeSolanaError = jest.fn();
export const writeFillDequeue = jest.fn();
export const writeDenyListAction = jest.fn();
export const getLastProcessedSig = jest.fn();
export const setLastProcessedSig = jest.fn();

// Reset all ddb mocks
export const __resetAllDdbMocks = () => {
     writeSolanaEvent.mockReset();
     writeSolanaError.mockReset();
     writeFillDequeue.mockReset();
     writeDenyListAction.mockReset();
     getLastProcessedSig.mockReset();
     setLastProcessedSig.mockReset();
};

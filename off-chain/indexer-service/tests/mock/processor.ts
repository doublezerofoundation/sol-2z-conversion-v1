// Mock for: src/core/processor.ts
export const mockProcessTx = jest.fn(async (_sig: string) => {});
export const processTx = (sig: string) => mockProcessTx(sig);
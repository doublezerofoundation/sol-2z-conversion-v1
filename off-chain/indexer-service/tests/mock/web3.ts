// Mock for: @solana/web3.js
export const __w3 = {
  onLogs: jest.fn((_pk: any, cb: any) => { (global as any).__onLogsCb = cb; return 1; }),
  getSignaturesForAddress: jest.fn(),
  getTransaction: jest.fn(),
  getBlockTime: jest.fn(async () => 111),
};

export class Connection {
  constructor(_url: string, _commitment?: string) {}
  onLogs = __w3.onLogs;
  getSignaturesForAddress = __w3.getSignaturesForAddress;
  getTransaction = __w3.getTransaction;
  getBlockTime = __w3.getBlockTime;
}

export class PublicKey {
  private k: string;
  constructor(k: string) { this.k = k; }
  toBase58() { return this.k; }
}

export type Logs = { signature: string };

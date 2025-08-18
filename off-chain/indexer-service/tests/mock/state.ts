// Mock for: src/core/state.ts
let recovering = true;
let lastSig: string | null = null;

export const isRecovering      = jest.fn(() => recovering);
export const endRecovery       = jest.fn(() => { recovering = false; });
export const getLastSignature  = jest.fn(async () => lastSig);
export const saveLastSignature = jest.fn(async (sig: string | null) => { lastSig = sig; });

// helpers
export const __setRecovering = (v: boolean) => { recovering = v; };
export const __setLastSig    = (v: string | null) => { lastSig = v; };

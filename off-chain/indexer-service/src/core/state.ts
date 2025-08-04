export interface IndexerStateConfig {
     lastProcessedSignature: string | null;
     highestSlot: number;
}

let state: IndexerStateConfig = {
     lastProcessedSignature: null,
     highestSlot: 0,
};

let recovering = false;

export async function getLastSignature(): Promise<string | null> {
     return state.lastProcessedSignature;
}
export async function saveLastSignature(sig: string) {
     state.lastProcessedSignature = sig;
}
export async function getHighestSlot(): Promise<number> {
     return state.highestSlot;
}
export async function saveHighestSlot(slot: number) {
     state.highestSlot = slot;
}

export function isRecovering() {
  return recovering;
}

export function startRecovery() {
  recovering = true;
}

export function endRecovery() {
  recovering = false;
}

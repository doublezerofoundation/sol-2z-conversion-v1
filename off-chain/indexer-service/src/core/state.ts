export interface IndexerStateConfig {
     lastProcessedSignature: string | null
}

let state: IndexerStateConfig = {
     lastProcessedSignature: null
};

let recovering = false;

export async function getLastSignature(): Promise<string | null> {
     return state.lastProcessedSignature;
}
export async function saveLastSignature(sig: string) {
     state.lastProcessedSignature = sig;
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

import { getLastProcessedSig, setLastProcessedSig } from "../utils/ddb";

let recovering = true; 

export async function getLastSignature(): Promise<string | null> {
  return await getLastProcessedSig();
}

export async function saveLastSignature(sig: string | null) {
  await setLastProcessedSig(sig);
}

export function isRecovering() {
  return recovering;
}

export function endRecovery() {
  recovering = false;
}
export interface AttestationData {
    swapRate: string;
    timestamp: number;
}

export interface AttestationResult {
    signature: string;
    publicKey: string;
}

export interface KeyPair {
    privateKey: Uint8Array;
    publicKey: string;
}

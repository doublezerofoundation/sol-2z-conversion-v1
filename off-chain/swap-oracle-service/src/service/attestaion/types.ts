export interface AttestationData {
    swapRate: string;
    timestamp: number;
}

export interface AttestationResult {
    signature: Uint8Array;
    publicKey: string;
}

export interface KeyPair {
    privateKey: Uint8Array;
    publicKey: string;
}

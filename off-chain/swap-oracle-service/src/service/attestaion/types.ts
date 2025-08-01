export interface AttestationData {
    swapRate: string;
    timestamp: number;
}

export interface AttestationResult {
    signature: string;
    recovery_id: number;
}

export interface KeyPair {
    privateKey: Uint8Array;
    publicKey: string;
}

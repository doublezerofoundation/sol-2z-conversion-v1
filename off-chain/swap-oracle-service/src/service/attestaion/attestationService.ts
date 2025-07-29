import {KeyManager} from "./keyManager";
import { signBytes, getUtf8Encoder } from "@solana/kit";
import {AttestationData, AttestationResult} from "./types";

export class AttestationService {
    private keyManager: KeyManager;

    constructor() {
        this.keyManager = new KeyManager()
    }

    async createAttestation(dada: AttestationData):Promise<AttestationResult> {
        const { swapRate, timestamp } = dada;
        const messageString = `${swapRate}|${timestamp}`;

        const keys = await this.keyManager.getKeys();
        const message = getUtf8Encoder().encode(messageString);
        console.log("private key: ", keys.secretKey)
        console.log("public key: ", keys.publicKey)
        const cryptokey = cr
        const signedBytes = await signBytes(keys.secretKey, message);

        return {
            signature: signedBytes,
            publicKey: keys.publicKey
        };

    }
}

import {KeyManager} from "./keyManager";
import { signBytes, getUtf8Encoder } from "@solana/kit";
import {AttestationData, AttestationResult} from "./types";
export class AttestationService {
    private keyManager: KeyManager;

    constructor() {
        this.keyManager = new KeyManager()
    }

    async createAttestation(dada: AttestationData):Promise<string> {
        const { swapRate, timestamp } = dada;
        const messageString = `${swapRate}|${timestamp}`;

        const keys = await this.keyManager.getKeys();
        const message = getUtf8Encoder().encode(messageString);
        console.log("private key: ", keys.keyPair.privateKey)
        console.log("public key: ", keys.address)

        const signedBytes = await signBytes(keys.keyPair.privateKey, message);
        console.log("signedBytes: ", signedBytes)
        const base64SignedBytes = Buffer.from(signedBytes).toString('base64');
        console.log("base64 encoded signedBytes: ", base64SignedBytes)

        return base64SignedBytes

    }
}

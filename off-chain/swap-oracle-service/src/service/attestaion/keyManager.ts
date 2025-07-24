import {generateKeyPair, generateKeyPairSigner} from "@solana/kit";
import {KeyPair} from "./types";
import {KeyPairSigner} from "@solana/signers/dist/types/keypair-signer";

export class KeyManager {
    private cachedKeys: KeyPairSigner = null;

    async getKeys(): Promise<KeyPairSigner> {
        // TODO: Get from parameter store instead of generating new keys
        if (!this.cachedKeys) {
            this.cachedKeys = await generateKeyPairSigner();
        }
        return this.cachedKeys;
    }

    // Method to load keys from parameter store (to be implemented)
    async loadKeysFromParameterStore(): Promise<KeyPair> {
        // TODO: Implement parameter store integration
        throw new Error("Parameter store integration not implemented yet");
    }

}
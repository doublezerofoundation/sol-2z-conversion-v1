import {KeyManager} from "./keyManager";
import { signBytes, getUtf8Encoder } from "@solana/kit";
import {AttestationData} from "../../types/common";
import { injectable, inject } from 'inversify';
import {TYPES} from "../../types/common";
import {logger} from "../../utils/logger";

export interface IAttestationService {
    createAttestation(data: AttestationData):Promise<string>;
}

@injectable()
export class AttestationService implements IAttestationService {

    constructor(@inject(TYPES.KeyManager) private keyManager: KeyManager) {}

    async createAttestation(data: AttestationData):Promise<string> {
        const { swapRate, timestamp } = data;
        
        // Must sign an integer to match on-chain u64 attestation verification
        if (!Number.isInteger(swapRate)) {
            throw new Error(`Attestation requires integer swapRate, got: ${swapRate}`);
        }
        
        const messageString = `${swapRate}|${timestamp}`;
        logger.debug("messageString: ", messageString)

        const keys = await this.keyManager.getKeyPairSigner();
        const message = getUtf8Encoder().encode(messageString);

        const signedBytes = await signBytes(keys.keyPair.privateKey, message);
        const base64SignedBytes = Buffer.from(signedBytes).toString('base64');
        logger.debug("base64 encoded signedBytes: ", base64SignedBytes)
        return base64SignedBytes

    }
}
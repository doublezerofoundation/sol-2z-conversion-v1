import {KeyManager} from "./keyManager";
import { signBytes, getUtf8Encoder } from "@solana/kit";
import {AttestationData} from "../../types/common";
import { injectable, inject } from 'inversify';
import {TYPES} from "../../types/common";

export interface IAttestationService {
    createAttestation(data: AttestationData):Promise<string>;
}

@injectable()
export class AttestationService implements IAttestationService {

    constructor(@inject(TYPES.KeyManager) private keyManager: KeyManager) {}

    async createAttestation(data: AttestationData):Promise<string> {
        const { swapRate, timestamp } = data;
        const messageString = `${swapRate}|${timestamp}`;
        console.log("messageString: ", messageString)

        const keys = await this.keyManager.getKeyPairSigner();
        const message = getUtf8Encoder().encode(messageString);

        const signedBytes = await signBytes(keys.keyPair.privateKey, message);
        const base64SignedBytes = Buffer.from(signedBytes).toString('base64');
        console.log("base64 encoded signedBytes: ", base64SignedBytes)
        return base64SignedBytes

    }
}
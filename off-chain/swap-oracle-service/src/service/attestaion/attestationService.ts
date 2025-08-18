import {KeyManager} from "./keyManager";
import { signBytes, getUtf8Encoder } from "@solana/kit";
import {AttestationData, AttestationResult} from "./types";
import  secp256k1 from 'secp256k1';
import {keccak256} from "js-sha3";
import { injectable, inject } from 'inversify';
import {TYPES} from "../../types/common";

export interface IAttestationService {
    createAttestation(data: AttestationData):Promise<string>;
    createSecp256k1Attestation(dada: AttestationData):Promise<AttestationResult>;
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

    async createSecp256k1Attestation(dada: AttestationData):Promise<AttestationResult> {
        const { swapRate, timestamp } = dada;
        const messageString = `${swapRate}|${timestamp}`;

        const privateKey = await this.keyManager.getKeyPair();
        const messageReadonly = getUtf8Encoder().encode(messageString);
        const messageBuffer = Buffer.from(messageReadonly);
        const messageHashHex = keccak256(messageBuffer);
        const messageHash = Buffer.from(messageHashHex, 'hex');
        const signedBytes = secp256k1.ecdsaSign(messageHash, privateKey)
        console.log("signedBytes: ", signedBytes)
        const base64SignedBytes = Buffer.from(signedBytes.signature).toString('base64');
        console.log("base64 encoded signedBytes: ", base64SignedBytes)

        return {
            signature: base64SignedBytes,
            recovery_id: signedBytes.recid
        }
    }
}
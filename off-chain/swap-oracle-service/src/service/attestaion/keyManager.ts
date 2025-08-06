import {
    createKeyPairSignerFromPrivateKeyBytes,
    KeyPairSigner
} from "@solana/kit";
import {GetParameterCommand, GetParameterCommandInput, SSMClient} from "@aws-sdk/client-ssm";
import * as process from "node:process";
const AWS_REGION:string = process.env.AWS_REGION || 'us-east-1';
import bs58 from 'bs58';
import {Keypair} from "@solana/web3.js";
import { injectable } from 'inversify';

@injectable()
export class KeyManager {
    private awsSSM: any;
    constructor() {
        this.awsSSM = new SSMClient({
            region: AWS_REGION
        })
    }

    async getKeyPair(): Promise<Uint8Array> {
        return await this.loadKeysFromParameterStore();
    }
    async getKeyPairSigner(): Promise<KeyPairSigner> {
        return await this.loadKeyPairSignerFromParameterStore();
    }

    async loadKeysFromParameterStore(): Promise<Uint8Array> {
        const params:GetParameterCommandInput = {
            Name: `/ml/oracle-pricing-key`,
            WithDecryption: true
        }

        const result = await this.awsSSM.send(new GetParameterCommand(params))
        if (!result.Parameter?.Value) {
            throw new Error("No value found in parameter store")
        }
        const value = result.Parameter.Value;
        const privateKeyBytes = bs58.decode(value);
        const keyPair = Keypair.fromSeed(privateKeyBytes);
        console.log(keyPair.publicKey.toString())

        return privateKeyBytes;


    }

    async loadKeyPairSignerFromParameterStore(): Promise<KeyPairSigner> {
        const params:GetParameterCommandInput = {
            Name: `/ml/oracle-pricing-key`,
            WithDecryption: true
        }

        const result = await this.awsSSM.send(new GetParameterCommand(params))
        if (!result.Parameter?.Value) {
            throw new Error("No value found in parameter store")
        }
        const value = result.Parameter.Value;
        const privateKeyBytes = bs58.decode(value);
        const cryptoKeyPair = await createKeyPairSignerFromPrivateKeyBytes(privateKeyBytes);
        console.log(cryptoKeyPair.address)

        return cryptoKeyPair;


    }

}

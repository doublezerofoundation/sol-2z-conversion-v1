import {
    createKeyPairSignerFromPrivateKeyBytes,
    KeyPairSigner
} from "@solana/kit";
import {GetParameterCommand, GetParameterCommandInput, SSMClient} from "@aws-sdk/client-ssm";
import * as process from "node:process";
const AWS_REGION:string = process.env.AWS_REGION || 'us-east-1';
const ENV:string = process.env.ENV || 'dev3';
import bs58 from 'bs58';
export class KeyManager {
    private cachedKeys: KeyPairSigner = null;
    private awsSSM: any;
    constructor() {
        this.awsSSM = new SSMClient({
            region: AWS_REGION
        })
    }

    async getKeys(): Promise<KeyPairSigner> {
        console.log("ENV: ", ENV)
        console.log("AWS_REGION: ", AWS_REGION)
        if (!this.cachedKeys) {
            this.cachedKeys = await this.loadKeysFromParameterStore();
        }
        return this.cachedKeys;
    }

    async loadKeysFromParameterStore(): Promise<KeyPairSigner> {
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
        console.log("keyPairSigner: ", cryptoKeyPair)
        console.log(cryptoKeyPair.address)

        return cryptoKeyPair;


    }


}
import {
    createKeyPairSignerFromPrivateKeyBytes,
    KeyPairSigner
} from "@solana/kit";
import {GetParameterCommand, GetParameterCommandInput, SSMClient} from "@aws-sdk/client-ssm";
import * as process from "node:process";
const AWS_REGION:string = process.env.AWS_REGION || 'us-east-1';
import bs58 from 'bs58';
import { injectable } from 'inversify';

export interface IKeyManager {
    getKeyPairSigner(): Promise<KeyPairSigner>;
}
@injectable()
export class KeyManager implements IKeyManager {
    private awsSSM: any;
    constructor() {
        this.awsSSM = new SSMClient({
            region: AWS_REGION
        })
    }
    async getKeyPairSigner(): Promise<KeyPairSigner> {
        return await this.loadKeyPairSignerFromParameterStore();
    }

    private async loadKeyPairSignerFromParameterStore(): Promise<KeyPairSigner> {
        const params:GetParameterCommandInput = {
            Name: `/double-zero/oracle-pricing-key`,
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

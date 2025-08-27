import {IKeyManager} from "../../src/service/attestation/keyManager";
import {createKeyPairSignerFromPrivateKeyBytes, KeyPairSigner} from "@solana/kit";
import bs58 from "bs58";
import {Keypair} from "@solana/web3.js";
import {injectable} from "inversify";
const PRIVATE_KEY = "Hgg3MkWLBrHiqahDLi8CQfcaVZuUTvWtAGwsFh3vYuX2"

@injectable()
export class MockKeyManager implements IKeyManager{
    async getKeyPair(): Promise<Uint8Array> {
        console.log("getKeyPair")
        const privateKeyBytes = bs58.decode(PRIVATE_KEY);
        const keyPair = Keypair.fromSeed(privateKeyBytes);
        console.log(keyPair.publicKey.toString())

        return privateKeyBytes;
    }

    async getKeyPairSigner(): Promise<KeyPairSigner> {
        const privateKeyBytes = bs58.decode(PRIVATE_KEY);
        const cryptoKeyPair = await createKeyPairSignerFromPrivateKeyBytes(privateKeyBytes);
        console.log(cryptoKeyPair.address)

        return cryptoKeyPair;
    }

    async getPublicKey(): Promise<CryptoKeyPair> {
        const keypair = await this.getKeyPairSigner();
        return keypair.keyPair;
    }

}
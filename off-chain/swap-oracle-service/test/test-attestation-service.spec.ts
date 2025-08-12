import {IKeyManager} from "../src/service/attestaion/keyManager";
import {MockKeyManager} from "./mock/mockKeyManager";
import {TYPES} from "../src/types/common";
import {IAttestationService} from "../src/service/attestaion/attestationService";
import {getUtf8Encoder, verifySignature} from "@solana/kit";
import container from "../src/factory/serviceContainer";
import {assert} from "chai";

describe('Attestation Service', () => {
    beforeEach(async () => {
        await container.unbind(TYPES.KeyManager)
        container.bind<IKeyManager>(TYPES.KeyManager).to(MockKeyManager).inSingletonScope();
    });


    it("Signature verification should be failed When swap rate modified", async()=>{
        let swapRate = 1000;
        let timestamp = 1635160000;
        const attestaion = container.get<IAttestationService>(TYPES.AttestationService);
        const signature = await attestaion.createAttestation({swapRate, timestamp})
        swapRate = 9000;
        const verified = await verifySwapSignature(swapRate, timestamp, signature);
        assert.isFalse(verified)
    })

    it("Signature verification should be failed When TimeStamp modified", async()=>{
        let swapRate = 1000;
        let timestamp = 1635160000;
        const attestaion = container.get<IAttestationService>(TYPES.AttestationService);
        const signature = await attestaion.createAttestation({swapRate, timestamp})
        timestamp = 1635160002;
        const verified = await verifySwapSignature(swapRate, timestamp, signature);
        assert.isFalse(verified)
    })

    it("Signature verification should be failed When Signature modified", async()=>{
        let swapRate = 1000;
        let timestamp = 1635160000;
        const attestaion = container.get<IAttestationService>(TYPES.AttestationService);
        let signature = await attestaion.createAttestation({swapRate, timestamp})
        console.log("Signature1: ", signature, "")
        signature = signature.replace("==", "B");

        const verified = await verifySwapSignature(swapRate, timestamp, signature);
        assert.isFalse(verified)
    })

    it("Signature verification should be success", async()=>{
        let swapRate = 1000;
        let timestamp = 1635160000;
        const attestaion = container.get<IAttestationService>(TYPES.AttestationService);
        const signature = await attestaion.createAttestation({swapRate, timestamp})
        const verified = await verifySwapSignature(swapRate, timestamp, signature);
        assert.isTrue(verified)
    })


})

async function verifySwapSignature(swapRate: number, timestamp: number, signature: string) {
    console.log("Signature2: ", signature, "")
    const messageString = `${swapRate}|${timestamp}`;
    console.log("messageString: ", messageString)
    const message = getUtf8Encoder().encode(messageString);
    const keyManger: MockKeyManager = container.get(TYPES.KeyManager)
    const pubKey = await keyManger.getPublicKey()
    const signedBytes = new Uint8Array(Buffer.from(signature, 'base64')) as any;
    return await verifySignature(pubKey.publicKey, signedBytes, message);
}
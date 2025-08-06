import { describe } from "mocha";
import { getConversionPriceAndVerify, getConversionPriceToFail } from "./core/test-flow/conversion-price";
import { getOraclePriceData, OraclePriceData } from "./core/utils/price-oracle";
import { getDefaultKeyPair } from "./core/utils/accounts";
import { Keypair } from "@solana/web3.js";
import { addToDenyListAndVerify, removeFromDenyListAndVerify } from "./core/test-flow/deny-list";
import {initializeSystemIfNeeded} from "./core/test-flow/system-initialize";
import { setup } from "./core/setup";

describe("Conversion Price Tests", async () => {
    const program = await setup();

    before("Initialize the system if needed", async () => {
        await initializeSystemIfNeeded(program)
    });
    
    it("should get conversion price", async () => {
        await getConversionPriceAndVerify(program);
    });

    it("should fail to get conversion price for deny listed user", async () => {
        const keypair = Keypair.generate()

        // Add user to deny list
        await addToDenyListAndVerify(program, keypair.publicKey);
        await getConversionPriceToFail(program, await getOraclePriceData(), "User is blocked in the DenyList", keypair);

        // Revert: Remove user from deny list
        await removeFromDenyListAndVerify(program, keypair.publicKey);
    });

    it("should fail to get conversion price for invalid signature", async () => {
        const oraclePriceData: OraclePriceData = {
            swapRate: "1.0",
            timestamp: 1722633600,
            signature: "invalid_signature",
        };
        await getConversionPriceToFail(program, oraclePriceData, "Attestation is Invalid");
    });
});
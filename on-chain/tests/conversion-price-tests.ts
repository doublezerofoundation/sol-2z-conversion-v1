import { describe } from "mocha";
import { getConversionPriceAndVerify, getConversionPriceToFail } from "./core/test-flow/conversion-price";
import { getOraclePriceData, OraclePriceData } from "./core/utils/price-oracle";
import { Keypair } from "@solana/web3.js";
import { addToDenyListAndVerify, removeFromDenyListAndVerify, setDenyListAuthorityAndVerify } from "./core/test-flow/deny-list";
import {initializeSystemIfNeeded} from "./core/test-flow/system-initialize";
import { setup } from "./core/setup";
import { DEFAULT_CONFIGS } from "./core/utils/configuration-registry";
import { updateConfigsAndVerify } from "./core/test-flow/change-configs";
import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { buySolAndVerify } from "./core/test-flow/buy-sol-flow";
import { getDefaultKeyPair } from "./core/utils/accounts";

describe("Conversion Price Tests", async () => {
    const program = await setup();

    before("Initialize the system if needed", async () => {
        await initializeSystemIfNeeded(program)
        // Set deny list authority to admin
        await setDenyListAuthorityAndVerify(program, getDefaultKeyPair().publicKey);
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
            swapRate: 12000000,
            timestamp: 1722633600,
            signature: "invalid_signature",
        };
        await getConversionPriceToFail(program, oraclePriceData, "Attestation is Invalid");
    });

    it("Conversion price should update for every slot passed", async () => {
        const askPrice = await getConversionPriceAndVerify(program);

        // 2 slots passed
        await new Promise(resolve => setTimeout(resolve, 2000));
        const newAskPrice = await getConversionPriceAndVerify(program);
        assert(newAskPrice < askPrice, "Conversion price should decrease for every slot passed");
    });
});
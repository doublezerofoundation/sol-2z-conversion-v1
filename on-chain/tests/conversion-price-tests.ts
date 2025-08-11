import { describe } from "mocha";
import { ConverterProgram } from "../target/types/converter_program";
import { Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { getConversionPriceAndVerify, getConversionPriceToFail } from "./core/test-flow/conversion-price";
import { getOraclePriceData, OraclePriceData } from "./core/utils/price-oracle";
import { getDefaultKeyPair } from "./core/utils/accounts";
import { Keypair, PublicKey } from "@solana/web3.js";
import { addToDenyListAndVerify, removeFromDenyListAndVerify } from "./core/test-flow/deny-list";
import {initializeSystemIfNeeded} from "./core/test-flow/system-initialize";
import { DEFAULT_CONFIGS } from "./core/utils/configuration-registry";
import { updateConfigsAndVerify } from "./core/test-flow/change-configs";

describe("Conversion Price Tests", async () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.converterProgram as Program<ConverterProgram>;

    before("Initialize the system if needed", async () => {
        await initializeSystemIfNeeded(program)
    });

    it("should get conversion price", async () => {
        await getConversionPriceAndVerify(program, getDefaultKeyPair());
    });

    it("should fail to get conversion price for deny listed user", async () => {
        const keypair = Keypair.generate()

        // Add user to deny list
        await addToDenyListAndVerify(program, keypair.publicKey);
        await getConversionPriceToFail(program, await getOraclePriceData(), keypair, "User is blocked in the DenyList");

        // Revert: Remove user from deny list
        await removeFromDenyListAndVerify(program, keypair.publicKey);
    });

    it("should fail to get conversion price for invalid signature", async () => {
        const oraclePriceData: OraclePriceData = {
            swapRate: 12000000,
            timestamp: 1722633600,
            signature: "invalid_signature",
        };
        await getConversionPriceToFail(program, oraclePriceData, getDefaultKeyPair(), "Attestation is Invalid");
    });

    it("should fail to get conversion price for invalid max discount rate", async () => {
        const oraclePriceData = await getOraclePriceData();

        // Set max discount rate to 10000
        await updateConfigsAndVerify(program, getDefaultKeyPair(), {
            maxDiscountRate: new anchor.BN(10001),
            steepness: new anchor.BN(90),
            solQuantity: new anchor.BN(25000000000),
            slotThreshold: new anchor.BN(134),
            priceMaximumAge: new anchor.BN(324),
            maxFillsStorage: new anchor.BN(234),
            oraclePubkey: DEFAULT_CONFIGS.oraclePubkey,
        });

        await getConversionPriceToFail(program, oraclePriceData, getDefaultKeyPair(), "Invalid max discount rate");

        // Revert: Set max discount rate to 5000
        await updateConfigsAndVerify(program, getDefaultKeyPair(), DEFAULT_CONFIGS);
    });
});
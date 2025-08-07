import { describe } from "mocha";
import { ConverterProgram } from "../target/types/converter_program";
import { Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { getConversionPriceAndVerify, getConversionPriceToFail } from "./core/test-flow/conversion-price";
import { getOraclePriceData, OraclePriceData } from "./core/utils/price-oracle";
import { getDefaultKeyPair } from "./core/utils/accounts";
import { Keypair } from "@solana/web3.js";
import { addToDenyListAndVerify, removeFromDenyListAndVerify } from "./core/test-flow/deny-list";
import {initializeSystemIfNeeded} from "./core/test-flow/system-initialize";

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
});
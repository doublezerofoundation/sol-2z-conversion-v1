import { describe } from "mocha";
import { ConverterProgram } from "../target/types/converter_program";
import { Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { getConversionPriceAndVerify, getConversionPriceToFail } from "./core/test-flow/conversion-price";
import { getOraclePriceData, OraclePriceData } from "./core/utils/price-oracle";
import { getDefaultKeyPair } from "./core/utils/accounts";
import { Keypair } from "@solana/web3.js";

describe("Conversion Price Tests", async () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.converterProgram as Program<ConverterProgram>;

    it("should get conversion price", async () => {
        await getConversionPriceAndVerify(program, getDefaultKeyPair());
    });

    it("should fail to get conversion price for deny listed user", async () => {
        const keypair = Keypair.generate()
        // TODO: when deny list is implemented, add the expected error message
        // await getConversionPriceToFail(program, await getOraclePriceData(), keypair, "");
    });

    it("should fail to get conversion price for invalid signature", async () => {
        const oraclePriceData: OraclePriceData = {
            swapRate: "1.0",
            timestamp: 1722633600,
            signature: "invalid_signature",
        };
        await getConversionPriceToFail(program, oraclePriceData, getDefaultKeyPair(), "Attestation is Invalid");
    });
});
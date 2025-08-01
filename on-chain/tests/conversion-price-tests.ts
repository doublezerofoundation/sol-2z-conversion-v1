import { describe } from "mocha";
import { DEFAULT_ORACLE_PRICE_DATA } from "./core/utils/price-oracle";
import { getDefaultKeyPair } from "./core/utils/accounts";
import { ConverterProgram } from "../target/types/converter_program";
import { Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { getConversionPriceAndVerify } from "./core/test-flow/conversion-price";

describe("Conversion Price Tests", async () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.converterProgram as Program<ConverterProgram>;
    const adminKeyPair = getDefaultKeyPair();

    const oraclePriceData = DEFAULT_ORACLE_PRICE_DATA;

    it("should get conversion price", async () => {
        await getConversionPriceAndVerify(program, oraclePriceData);
    });
});
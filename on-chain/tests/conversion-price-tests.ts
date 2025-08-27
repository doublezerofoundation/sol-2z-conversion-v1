import { describe } from "mocha";
import { getConversionPriceAndVerify, getConversionPriceToFail } from "./core/test-flow/conversion-price";
import { getOraclePriceData, getOraclePriceDataFor } from "./core/utils/price-oracle";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { initializeSystemIfNeeded } from "./core/test-flow/system-initialize";
import { setup } from "./core/setup";
import { assert } from "chai";
import { getDefaultKeyPair, getRandomKeyPair } from "./core/utils/accounts";
import {BPS, ErrorMsg, Events, TOKEN_UNITS} from "./core/constants";
import { DEFAULT_CONFIGS } from "./core/utils/configuration-registry";
import {MockTransferProgram} from "../../mock-double-zero-program/target/types/mock_transfer_program";
import mockTransferProgramIdl from "../../mock-double-zero-program/target/idl/mock_transfer_program.json";
import { Idl, Program } from "@coral-xyz/anchor";
import { getMockDoubleZeroTokenMintPDA } from "./core/utils/pda-helper";
import { createTokenAccount } from "./core/utils/token-utils";
import { airdropVault } from "./core/utils/mock-transfer-program-utils";
import { initializeMockTransferSystemIfNeeded, mint2z } from "./core/test-flow/mock-transfer-program";
import { buySolAndVerify } from "./core/test-flow/buy-sol-flow";
import {updateConfigsAndVerify} from "./core/test-flow/change-configs";

describe("Conversion Price Tests", async () => {
    const program = await setup();
    const mockTransferProgram: Program<MockTransferProgram> = new Program(mockTransferProgramIdl as Idl, program.provider);

    before("Initialize the system if needed", async () => {
        await initializeSystemIfNeeded(program)
        await initializeMockTransferSystemIfNeeded(mockTransferProgram);
        await updateConfigsAndVerify(program, DEFAULT_CONFIGS);
    });

    // Sanity checks -----------------------------------------------------------

    it("Sanity check on oracle price data", async () => {
        // Sanity checks for mock oracle price data.
        const oraclePriceData = await getOraclePriceData();
        assert(oraclePriceData.swapRate > 0, "Swap rate should be greater than 0");
        assert(oraclePriceData.timestamp > 0, "Timestamp should be greater than 0");
        assert(oraclePriceData.timestamp <= Math.floor(Date.now() / 1000), "Timestamp should be less than or equal to current time");
        assert(oraclePriceData.timestamp > Math.floor(Date.now() / 1000) - 60, "Timestamp should be within 60 seconds");
        assert(oraclePriceData.signature.length > 0, "Signature should not be empty");
    });

    it("Sanity check on default configuration", async () => {
        // Sanity checks for default configuration.
        const minDiscountRate = DEFAULT_CONFIGS.minDiscountRate.toNumber() / (100 * BPS);
        assert(minDiscountRate >= 0, "Minimum discount rate should be greater than or equal to 0");
        assert(minDiscountRate <= 1, "Minimum discount rate should be less than or equal to 1");

        const maxDiscountRate = DEFAULT_CONFIGS.maxDiscountRate.toNumber() / (100 * BPS);
        assert(maxDiscountRate >= 0, "Maximum discount rate should be greater than or equal to 0");
        assert(maxDiscountRate <= 1, "Maximum discount rate should be less than or equal to 1");

        assert(minDiscountRate <= maxDiscountRate,
            "Minimum discount rate should be less than or equal to maximum discount rate");
    });

    // Success cases -----------------------------------------------------------

    it("Should get valid conversion price", async () => {
        // Get mock oracle price data.
        const oraclePriceData = await getOraclePriceData();

        // A conversion price should be returned based on the oracle price data.
        const conversionPrice = await getConversionPriceAndVerify(program, oraclePriceData);
        assert(conversionPrice != null, "Conversion price should not be null");
        assert(conversionPrice > 0, "Conversion price should be greater than 0");

        // Conversion price should be within the range of min and max prices as per the discount rates.
        const minPrice = Math.trunc(oraclePriceData.swapRate * (1 - DEFAULT_CONFIGS.maxDiscountRate.toNumber() / (100 * BPS)));
        const maxPrice = Math.trunc(oraclePriceData.swapRate * (1 - DEFAULT_CONFIGS.minDiscountRate.toNumber() / (100 * BPS)));
        assert(minPrice > 0, "Minimum price should be greater than 0");
        assert(maxPrice > 0, "Maximum price should be greater than 0");
        assert(minPrice <= maxPrice, "Minimum price should be less than or equal to maximum price");
        assert(conversionPrice >= minPrice, "Conversion price should be greater than or equal to minimum price");
        assert(conversionPrice <= maxPrice, "Conversion price should be less than or equal to maximum price");
    });

    it("Should update conversion price down for every slot passed without trades", async () => {
        // Get mock oracle price data.
        const oraclePriceData = await getOraclePriceData();

        // Get current conversion price.
        const slot1 = await program.provider.connection.getSlot();
        const price1 = await getConversionPriceAndVerify(program, oraclePriceData);

        // Make sure we are currently not at the minimum price already.
        const minPrice = Math.trunc(oraclePriceData.swapRate * (1 - DEFAULT_CONFIGS.maxDiscountRate.toNumber() / (100 * BPS)));
        assert(price1 > minPrice, "Conversion price should be greater than minimum price");

        // Allow some time for the slot to change.
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get the new conversion price based on the same oracle price data.
        const slot2 = await program.provider.connection.getSlot();
        const price2 = await getConversionPriceAndVerify(program, oraclePriceData);

        // Slots should have advanced and the new price should be less than or equal to the previous price.
        assert(slot2 > slot1, "Slot should have advanced");
        assert(price2 < price1, "Conversion price should decrease for every slot passed");

        // Incremental discount should be based on the slot difference.
        // Note that we allow for a small tolerance in the pricing calculation due to the possible slot changes
        // between fetching `slot2` and the actual price calculation fetched in `price2`.
        const slotDiscount = Math.trunc(oraclePriceData.swapRate * DEFAULT_CONFIGS.coefficient.toNumber() / 100000000);
        const slotTolerance = 2;
        const priceUpperBound = price1 - slotDiscount * (slot2 - slot1);
        const priceLowerBound = price1 - slotDiscount * (slot2 - slot1 + slotTolerance);
        assert(price2 >= priceLowerBound, "New conversion price should be greater than or equal to expected lower bound");
        assert(price2 <= priceUpperBound, "New conversion price should be less than or equal to expected upper bound");
    });

    it("Should update conversion price down and within bounds", async () => {
        // Get mock oracle price data.
        const oraclePriceData = await getOraclePriceData();

        // Get current conversion price.
        let price1 = await getConversionPriceAndVerify(program, oraclePriceData);

        // Compute price bounds.
        const minPrice = Math.trunc(oraclePriceData.swapRate * (1 - DEFAULT_CONFIGS.maxDiscountRate.toNumber() / (100 * BPS)));
        const maxPrice = Math.trunc(oraclePriceData.swapRate * (1 - DEFAULT_CONFIGS.minDiscountRate.toNumber() / (100 * BPS)));

        // Progressively check the conversion price across multiple slot transitions.
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const price2 = await getConversionPriceAndVerify(program, oraclePriceData);

            assert(price2 < price1 || (price2 == price1 && price2 == minPrice),
                "Conversion price should decrease for every slot passed unless we have reached the minimum price");
            assert(price2 >= minPrice && price2 <= maxPrice, "Conversion price should be within bounds");

            price1 = price2;
        }
    });

    it("Should switch to conversion price with minimum discount on trade", async () => {
        // Initialize a user account.
        const user = await getRandomKeyPair(program.provider.connection);

        // Create mock mint token ATA for user.
        const mockTokenMintPda = getMockDoubleZeroTokenMintPDA(mockTransferProgram.programId);
        const userAta = await createTokenAccount(program.provider.connection, mockTokenMintPda, user.publicKey);

        // Reimburse system and user for trades
        const solQuantity = DEFAULT_CONFIGS.solQuantity.toNumber() / LAMPORTS_PER_SOL;
        await airdropVault(mockTransferProgram, DEFAULT_CONFIGS.solQuantity);
        await mint2z(mockTransferProgram, userAta, 25 * solQuantity * TOKEN_UNITS);

        // Get conversion price.
        const oraclePriceData = await getOraclePriceData();
        const price1 = await getConversionPriceAndVerify(program, oraclePriceData);

        // Compute price bounds.
        const maxPrice = Math.trunc(oraclePriceData.swapRate * (1 - DEFAULT_CONFIGS.minDiscountRate.toNumber() / (100 * BPS)));
        assert(price1 < maxPrice, "Conversion price should be less than maximum price");

        // Execute a trade.
        const bidPrice = price1 + TOKEN_UNITS;
        await buySolAndVerify(program, mockTransferProgram, userAta, bidPrice, user, oraclePriceData);

        // Get the new conversion price.
        const price2 = await getConversionPriceAndVerify(program, oraclePriceData);

        // Allow a small tolerance to account for the time might take to fetch the new conversion price
        // after the trade is executed.
        const slotDiscount = Math.trunc(oraclePriceData.swapRate * DEFAULT_CONFIGS.coefficient.toNumber() / 100000000);
        const slotTolerance = 10;
        const priceUpperBound = maxPrice;
        const priceLowerBound = maxPrice - slotDiscount * slotTolerance;

        // Conversion price should have switched to the minimum discount rate.
        assert(price2 >= priceLowerBound, "Conversion price should be greater than or equal to expected lower bound");
        assert(price2 <= priceUpperBound, "Conversion price should be less than or equal to expected upper bound");
    });

    // Failure cases -----------------------------------------------------------

    it("Should fail to get conversion price for negative swap rate", async () => {
        // Get mock oracle price data with a negative swap rate.
        const oraclePriceData = await getOraclePriceDataFor(-10, Math.floor(Date.now() / 1000));

        // Conversion price fetch should fail for negative swap rate.
        // Since the swap rate is stored as an u64, it will be stored as a positive number even if it is negative.
        // But the attestation is not authentic, so the transaction should fail.
        await getConversionPriceToFail(
            program,
            oraclePriceData,
            ErrorMsg.ATTESTATION_NOT_AUTHENTIC,
            getDefaultKeyPair(),
        );
    });

    it("Should fail to get conversion price for zero swap rate", async () => {
        // Get mock oracle price data with a zero swap rate.
        const oraclePriceData = await getOraclePriceDataFor(0, Math.floor(Date.now() / 1000));

        // Conversion price fetch should fail for zero swap rate.
        await getConversionPriceToFail(program, oraclePriceData, ErrorMsg.INVALID_ORACLE_SWAP_RATE);
    });

    it("Should fail to get conversion price for stale oracle data", async () => {
        const maxAge = DEFAULT_CONFIGS.priceMaximumAge.toNumber();
        const tolerance = 2;
        const staleTimestamp = Math.floor(Date.now() / 1000) - maxAge - tolerance;
        // Get mock oracle price data with a stale timestamp (older than 60 seconds).
        const oraclePriceData = await getOraclePriceDataFor(20, staleTimestamp);

        // Conversion price fetch should fail for stale oracle data.
        await getConversionPriceToFail(program, oraclePriceData, ErrorMsg.STALE_PRICE);
    });

    it("Should fail to get conversion price for future oracle data", async () => {
        const maxAge = DEFAULT_CONFIGS.priceMaximumAge.toNumber();
        const tolerance = 2;
        const futureTimestamp = Math.floor(Date.now() / 1000) + maxAge + tolerance;
        // Get mock oracle price data with a future timestamp.
        const oraclePriceData = await getOraclePriceDataFor(20, futureTimestamp);

        // Conversion price fetch should fail for future oracle data.
        await getConversionPriceToFail(program, oraclePriceData, ErrorMsg.STALE_PRICE);
    });

    it("Should fail to get conversion price for empty attestation signature", async () => {
        // Get mock oracle price data and update the signature to empty.
        const oraclePriceData = await getOraclePriceData();
        oraclePriceData.signature = "";

        // Conversion price fetch should fail for empty attestation signature.
        await getConversionPriceToFail(
            program,
            oraclePriceData,
            ErrorMsg.ATTESTATION_NOT_AUTHENTIC,
            getDefaultKeyPair(),
        );
    });

    it("Should fail to get conversion price for invalid attestation signature", async () => {
        // Get mock oracle price data and update the signature to invalid.
        const oraclePriceData = await getOraclePriceData();
        oraclePriceData.signature = "invalid_signature";

        // Conversion price fetch should fail for invalid attestation signature.
        await getConversionPriceToFail(program, oraclePriceData, ErrorMsg.ATTESTATION_INVALID);
    });
});

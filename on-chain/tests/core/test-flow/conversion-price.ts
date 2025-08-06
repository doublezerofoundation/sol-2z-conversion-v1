import { BN, Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../../../target/types/converter_program";
import { getConfigurationRegistryPDA, getDenyListRegistryPDA, getProgramStatePDA } from "../utils/pda-helper";
import { getDefaultKeyPair } from "../utils/accounts";
import { getOraclePriceData, OraclePriceData } from "../utils/price-oracle";
import { assert, expect } from "chai";
import { decodeAndValidateReturnData, getUint64FromBuffer, ReturnData } from "../utils/return-data";
import { DECIMAL_PRECISION } from "../constants";
import { Keypair } from "@solana/web3.js";

export const getConversionPriceAndVerify = async (program: Program<ConverterProgram>, signer: Keypair = getDefaultKeyPair()) => {
    const oraclePriceData = await getOraclePriceData();
    const configurationRegistryPDA = await getConfigurationRegistryPDA(program.programId);

    const configurationRegistry = await program.account.configurationRegistry.fetch(configurationRegistryPDA);

    const swapRateBps = parseFloat(oraclePriceData.swapRate) * DECIMAL_PRECISION;
    const solQuantity = configurationRegistry.solQuantity.toNumber();
    const expectedAskPrice = solQuantity * swapRateBps * (1 - 0.5);

    const signature = await program.methods.calculateAskPrice({
        swapRate: oraclePriceData.swapRate,
        timestamp: new BN(oraclePriceData.timestamp),
        signature: oraclePriceData.signature,
    })
        .accounts({
            signer: signer.publicKey,
        })
        .signers([signer])
        .rpc();

    // Retry 5 times
    for (let i = 0; i < 5; i++) {
        // Wait for 1 second
        setTimeout(() => { }, 2000);

        const transaction: any = await program.provider.connection.getTransaction(signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 1,
        });

        if (!transaction || !transaction.meta || !transaction.meta.returnData) {
            if (i === 4) {
                assert.fail("Transaction not found");
            }
            continue;
        }

        const returnData = transaction.meta.returnData as ReturnData;

        try {
            const decodedReturnData = decodeAndValidateReturnData(returnData, program.programId.toString());
            if (decodedReturnData.length < 8) {
                assert.fail("Decoded return data is too short to contain a u64 value");
            }

            const actualAskPrice = getUint64FromBuffer(decodedReturnData);

            // Assert that actualAskPrice is within errorMargin of expectedAskPrice
            const errorMargin = 0.01;
            const lowerBound = expectedAskPrice * (1 - errorMargin);
            const upperBound = expectedAskPrice * (1 + errorMargin);

            assert(
                actualAskPrice >= lowerBound && actualAskPrice <= upperBound,
                `actualAskPrice (${actualAskPrice}) is not within ${errorMargin * 100}% of expectedAskPrice (${expectedAskPrice})`
            );
        } catch (error) {
            assert.fail("Error decoding return data", error);
        }

        break;
    }
}

export const getConversionPriceToFail = async (
    program: Program<ConverterProgram>,
    oraclePriceData: OraclePriceData,
    expectedError: string,
    signer: Keypair = getDefaultKeyPair(),
) => {
    try {
        const signature = await program.methods.calculateAskPrice({
            swapRate: oraclePriceData.swapRate,
            timestamp: new BN(oraclePriceData.timestamp),
            signature: oraclePriceData.signature,
        })
            .accounts({
                signer: signer.publicKey,
            })
            .signers([signer])
            .rpc();
    } catch (e) {
        expect((new Error(e!.toString())).message).to.include(expectedError);
        assert.ok(true, "Transaction failed as expected");
        return;
    }
    assert.fail("Transaction should have failed");
}

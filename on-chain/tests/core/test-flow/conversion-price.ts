import { BN, Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../../../target/types/converter_program";
import { getOraclePriceData, OraclePriceData } from "../utils/price-oracle";
import { assert, expect } from "chai";
import { decodeAndValidateReturnData, getUint64FromBuffer, ReturnData } from "../utils/return-data";
import { Keypair } from "@solana/web3.js";
import { getDefaultKeyPair } from "../utils/accounts";
import { getProgramStatePDA } from "../utils/pda-helper";
import { fetchCurrentConfiguration } from "../utils/configuration-registry";

export const getConversionPriceAndVerify = async (program: Program<ConverterProgram>, oraclePriceData: OraclePriceData, signer: Keypair = getDefaultKeyPair()) => {
    const {lastTradeSlot} = await program.account.programStateAccount.fetch(getProgramStatePDA(program.programId));
    const currentSlot = await program.provider.connection.getSlot();
    const {coefficient, maxDiscountRate, minDiscountRate} = await fetchCurrentConfiguration(program);
    let discountRate = ((coefficient.toNumber() / 100000000) * (currentSlot - lastTradeSlot.toNumber())) + (minDiscountRate.toNumber() / 10000);
    if (discountRate > (maxDiscountRate.toNumber() / 10000)) {
        discountRate = maxDiscountRate.toNumber() / 10000;
    }
    const expectedAskPrice = oraclePriceData.swapRate * (1 - discountRate);

    const signature = await program.methods.getConversionRate({
        swapRate: new BN(oraclePriceData.swapRate),
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
            const errorMargin = 1;
            const lowerBound = expectedAskPrice * (1 - errorMargin);
            const upperBound = expectedAskPrice * (1 + errorMargin);

            assert(
                actualAskPrice >= lowerBound && actualAskPrice <= upperBound,
                `actualAskPrice (${actualAskPrice}) is not within ${errorMargin * 100}% of expectedAskPrice (${expectedAskPrice})`
            );
            return Number(actualAskPrice);
        } catch (error) {
            assert.fail("Error decoding return data", error);
        }
    }
}

export const getConversionPriceToFail = async (
    program: Program<ConverterProgram>,
    oraclePriceData: OraclePriceData,
    expectedError: string,
    signer: Keypair = getDefaultKeyPair(),
) => {
    try {
        await program.methods.getConversionRate({
            swapRate: new BN(oraclePriceData.swapRate),
            timestamp: new BN(oraclePriceData.timestamp),
            signature: oraclePriceData.signature,
        })
            .accounts({
                signer: signer.publicKey,
            })
            .signers([signer])
            .rpc();
    } catch (e) {
        if (e!.toString().includes(expectedError)) {
            expect((new Error(e!.toString())).message).to.include(expectedError);
            assert.ok(true, "Transaction failed as expected");
            return;
        } else {
            console.log(e);
            assert.fail("Transaction failed with unexpected error", e);
        }
    }
    assert.fail("Transaction should have failed");
}

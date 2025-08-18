import {BN, Program} from "@coral-xyz/anchor";
import {ConverterProgram} from "../../../target/types/converter_program";
import {assert, expect} from "chai";
import {Keypair, PublicKey} from "@solana/web3.js";
import {Fill, FillsRegistry, getFillsRegistryAccount, getFillsRegistryAccountAddress} from "../utils/fills-registry";
import {decodeAndValidateReturnData, getUint64FromBuffer, ReturnData} from "../utils/return-data";

export async function dequeueFillsSuccess(
    program: Program<ConverterProgram>,
    maxSolAmount: BN,
    signer: Keypair,
): Promise<void> {
    const fillsRegistryAddress: PublicKey = await getFillsRegistryAccountAddress(program);
    const fillsRegistryBefore: FillsRegistry = await getFillsRegistryAccount(program);
    const signature = await program.methods.dequeueFills(maxSolAmount)
        .accounts({
            fillsRegistry: fillsRegistryAddress,
            signer: signer.publicKey
        })
        .signers([signer])
        .rpc();

    let resultSolDequeued: number;
    let resultTokenDequeued: number;
    let resultFillsConsumed: number;
    // Retry 5 times
    for (let i = 0; i < 5; i++) {
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

            resultSolDequeued = Number(getUint64FromBuffer(decodedReturnData));
            resultTokenDequeued = Number(getUint64FromBuffer(decodedReturnData, 8));
            resultFillsConsumed = Number(getUint64FromBuffer(decodedReturnData, 16));
            break;
        } catch (error) {
            assert.fail("Error decoding return data", error);
        }
    }

    const fillsRegistryAfter: FillsRegistry = await getFillsRegistryAccount(program);
    const fills: Fill[] = fillsRegistryBefore.fills;
    let solDequeued: number = 0;
    let tokenDequeued: number = 0;
    let fillsConsumed: number = 0;
    while (fills.length > 0 &&
        solDequeued + fills[0].solIn <= Number(maxSolAmount)) {
        solDequeued += fills[0].solIn;
        tokenDequeued += fills[0].token2ZOut;
        fillsConsumed += 1
        fills.splice(0, 1);
    }

    // Check Output values
    assert.equal(resultSolDequeued, solDequeued);
    assert.equal(resultTokenDequeued, tokenDequeued);
    assert.equal(resultFillsConsumed, fillsConsumed);
    expect(fillsRegistryAfter.fills).to.deep.equal(fills);
    assert.equal(fillsRegistryAfter.count, fillsRegistryBefore.count - fillsConsumed);
}

export async function dequeueFillsFail(
    program: Program<ConverterProgram>,
    max_sol_amount: BN,
    signer: Keypair,
    expectedError: string,
): Promise<void> {
    const fillsRegistryAddress: PublicKey = await getFillsRegistryAccountAddress(program);
    try {
        await program.methods.dequeueFills(max_sol_amount)
            .accounts({
                fillsRegistry: fillsRegistryAddress,
                signer: signer.publicKey
            })
            .signers([signer])
            .rpc();
    } catch (error) {
        console.log(error);
        expect((new Error(error!.toString())).message).to.include(expectedError);
        assert.ok(true, "Buy SOL is rejected as expected");
        return; // Exit early — test passes
    }
    assert.fail("It was able to do dequeue Fills");
}

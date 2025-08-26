import {BN, Program} from "@coral-xyz/anchor";
import {ConverterProgram} from "../../../target/types/converter_program";
import {assert, expect} from "chai";
import {Keypair, PublicKey} from "@solana/web3.js";
import {FillsRegistry, getFillsRegistryAccount, getFillsRegistryAccountAddress} from "../utils/fills-registry";
import {
    decodeAndValidateReturnData, delay,
    findAnchorEventInLogs,
    getTransactionLogs,
    getUint64FromBuffer,
    ReturnData
} from "../utils/return-data";
import {Events} from "../constants";

export async function consumeFillsSuccess(
    program: Program<ConverterProgram>,
    maxSolAmount: number,
    signer: Keypair,
    expectedTokenConsumed: number,
    expectedFillsConsumed: number,
    beforeCount: number,
    expectedFinalCount: number,
    expectedHeadChange: number
): Promise<void> {
    const fillsRegistryAddress: PublicKey = await getFillsRegistryAccountAddress(program);
    const fillsRegistryBefore = await getFillsRegistryAccount(program);
    assert.equal(
        fillsRegistryBefore.count,
        beforeCount,
        "After buy SOL, count should change as expected"
    );

    let signature: string;
    try {
        signature = await program.methods.dequeueFills(new BN(maxSolAmount))
            .accounts({
                fillsRegistry: fillsRegistryAddress,
                signer: signer.publicKey
            })
            .signers([signer])
            .rpc();
    } catch (e) {
        console.error("Consume fills  failed:", e);
        assert.fail("Consume fills  failed");
    }

    let resultSolConsumed: number;
    let resultTokenConsumed: number;
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
            await delay(500);
            continue;
        }

        const returnData = transaction.meta.returnData as ReturnData;
        try {
            const decodedReturnData = decodeAndValidateReturnData(returnData, program.programId.toString());
            if (decodedReturnData.length < 8) {
                assert.fail("Decoded return data is too short to contain a u64 value");
            }

            resultSolConsumed = Number(getUint64FromBuffer(decodedReturnData));
            resultTokenConsumed = Number(getUint64FromBuffer(decodedReturnData, 8));
            resultFillsConsumed = Number(getUint64FromBuffer(decodedReturnData, 16));
            break;
        } catch (error) {
            assert.fail("Error decoding return data", error);
        }
    }

    // Check Output values
    assert.equal(resultSolConsumed, maxSolAmount);
    assert.approximately(resultTokenConsumed, expectedTokenConsumed, 1);
    assert.equal(resultFillsConsumed, expectedFillsConsumed);

    const fillsRegistryAfter: FillsRegistry = await getFillsRegistryAccount(program);
    assert.equal(
        fillsRegistryAfter.count,
        expectedFinalCount,
        "Count should change by correct amount"
    );
    assert.equal(
        fillsRegistryAfter.head,
        (fillsRegistryBefore.head + expectedHeadChange) % fillsRegistryBefore.maxCapacity,
        "Head pointer should move by expected amount in circular buffer manner"
    );

    // assert whether event has been emitted or not
    const logs = await getTransactionLogs(program.provider, signature);
    const event = await findAnchorEventInLogs(logs, program.idl, Events.FILLS_CONSUMED);
    expect(event, "Trade event should be emitted").to.exist;
}

export async function consumeFillsFail(
    program: Program<ConverterProgram>,
    max_sol_amount: BN,
    signer: Keypair,
    expectedError: string,
): Promise<void> {
    const fillsRegistryAddress: PublicKey = await getFillsRegistryAccountAddress(program);
    try {
        const signature = await program.methods.dequeueFills(max_sol_amount)
            .accounts({
                fillsRegistry: fillsRegistryAddress,
                signer: signer.publicKey
            })
            .signers([signer])
            .rpc();
        console.log("Transaction signature: ", signature)
    } catch (error) {
        expect((new Error(error!.toString())).message).to.include(expectedError);
        assert.ok(true, "Consume fills is rejected as expected");
        return; // Exit early — test passes
    }
    assert.fail("It was able to do consume Fills");
}

export async function clearUpFillsRegistry(
    program: Program<ConverterProgram>,
    userKeyPair: Keypair
) {
    const fillsRegistryBefore: FillsRegistry = await getFillsRegistryAccount(program);

    const solPending = fillsRegistryBefore.totalSolPending;
    const tokenPending = fillsRegistryBefore.total2ZPending;
    const count = fillsRegistryBefore.count;
    if (count > 0) {
        await consumeFillsSuccess(
            program,
            solPending,
            userKeyPair,
            tokenPending,
            count,
            count,
            0,
            count
        )
    }
}

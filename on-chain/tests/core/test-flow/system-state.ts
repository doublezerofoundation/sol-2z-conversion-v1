import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../../../target/types/converter_program";
import { getProgramStatePDA } from "../utils/pda-helper";
import { accountExists, getDefaultKeyPair } from "../utils/accounts";
import { Keypair } from "@solana/web3.js";
import { assert, expect } from "chai";

export const toggleSystemStateAndVerify = async (
    program: Program<ConverterProgram>,
    set_to: boolean,
    adminKeypair: Keypair = getDefaultKeyPair(),
) => {
    const [programStatePDA] = await Promise.all([
        getProgramStatePDA(program.programId),
    ]);

    const [programStateExists] = await Promise.all([
        accountExists(program.provider.connection, programStatePDA),
    ]);
    assert.isTrue(programStateExists, "Program state should be initialized");

    const programState = await program.account.programStateAccount.fetch(programStatePDA);
    assert.isTrue(programState.isHalted !== set_to, "System state should not be the same as the set_to");

    try {
        await program.methods.toggleSystemState(set_to)
        .accounts({
            admin: adminKeypair.publicKey,
        })
        .signers([adminKeypair])
        .rpc();
    } catch (error) {
        console.log("Error", error);
        assert.fail("Toggle system state should be successful");
    }

    const programStateAfter = await program.account.programStateAccount.fetch(programStatePDA);
    assert.isTrue(programStateAfter.isHalted === set_to, "System state should be the same as the set_to");
}

export const toggleSystemStateAndVerifyFail = async (
    program: Program<ConverterProgram>,
    set_to: boolean,
    expectedError: string,
    adminKeypair: Keypair = getDefaultKeyPair(),
) => {
    const [programStatePDA] = await Promise.all([
        getProgramStatePDA(program.programId),
    ]);

    const [programStateExists] = await Promise.all([
        accountExists(program.provider.connection, programStatePDA),
    ]);
    assert.isTrue(programStateExists, "Program state should be initialzied");

    try {
        await program.methods.toggleSystemState(set_to)
        .accounts({
            admin: adminKeypair.publicKey,
        })
        .signers([adminKeypair])
        .rpc();
    } catch (error) {
        expect((new Error(error!.toString())).message).to.include(expectedError);
        assert.ok(true, "Toggle system state should be rejected as expected");
        return; // Exit early — test passes
    }

    assert.fail("Toggle system state should be rejected as expected");
}
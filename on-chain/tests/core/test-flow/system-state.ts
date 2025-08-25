import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../../../target/types/converter_program";
import { getProgramStatePDA } from "../utils/pda-helper";
import { accountExists, getDefaultKeyPair } from "../utils/accounts";
import { Keypair } from "@solana/web3.js";
import { assert, expect } from "chai";
import {findAnchorEventInLogs, getTransactionLogs} from "../utils/return-data";
import {Events} from "../constants";

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

    let txSig: string;
    try {
        txSig = await program.methods.toggleSystemState(set_to)
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

    // assert whether event has been emitted or not
    const eventName = set_to ? Events.SYSTEM_HALTED : Events.SYSTEM_UNHALTED;
    const logs = await getTransactionLogs(program.provider, txSig);
    const event = await findAnchorEventInLogs(logs, program.idl, eventName);
    expect(event, "Appropriate Event should be emitted").to.exist;
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
    assert.isTrue(programStateExists, "Program state should be initialized");

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
        return; // Exit early — test passes.
    }

    assert.fail("Toggle system state should be rejected as expected");
}
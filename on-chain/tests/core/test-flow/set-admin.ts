import { Keypair } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../../../target/types/converter_program";
import { accountExists, getDefaultKeyPair } from "../utils/accounts";
import { PublicKey } from "@solana/web3.js";
import { getProgramDataAccountPDA, getProgramStatePDA } from "../utils/pda-helper";
import { assert, expect } from "chai";

export const setAdminAndVerify = async (
    program: Program<ConverterProgram>,
    new_admin: PublicKey,
    adminKeypair: Keypair = getDefaultKeyPair(),
) => {
    const pdas = await Promise.all([
        getProgramStatePDA(program.programId),
        getProgramDataAccountPDA(program.programId),
    ]);

    const [programStatePDA, programDataPDA] = pdas;

    const programState = await program.account.programStateAccount.fetch(programStatePDA);

    assert.isTrue(programState.admin.toBase58() !== new_admin.toBase58(), "Admin should be different from the current admin");

    let [programStateExists, programDataExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isTrue(programStateExists, "Program state should be initialzied");
    assert.isTrue(programDataExists, "Program data should be initialzied");

    try {
        await program.methods.setAdmin(new_admin)
        .accounts({
            admin: adminKeypair.publicKey,
            programData: programDataPDA,
        })
        .signers([adminKeypair])
        .rpc();

        const programState = await program.account.programStateAccount.fetch(programStatePDA);
        assert.equal(programState.admin.toBase58(), new_admin.toBase58(), "Admin should be set");
    } catch(e) {
        console.error("Set admin failed", e.errorLogs);
        assert.fail("Set admin failed");
    }
}

export const setAdminAndVerifyFail = async (
    program: Program<ConverterProgram>,
    adminKeypair: Keypair = getDefaultKeyPair(),
    new_admin: PublicKey,
    expectedError: string
) => {
    const pdas = await Promise.all([
        getProgramStatePDA(program.programId),
        getProgramDataAccountPDA(program.programId),
    ]);

    const [_, programDataPDA] = pdas;

    let [programStateExists, programDataExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isTrue(programStateExists, "Program state should be initialzied");
    assert.isTrue(programDataExists, "Program data should be initialzied");

    try {
        await program.methods.setAdmin(new_admin)
        .accounts({
            admin: adminKeypair.publicKey,
            programData: programDataPDA,
        })
        .signers([adminKeypair])
        .rpc();
    } catch(e) {
        expect((new Error(e!.toString())).message).to.include(expectedError);
        assert.ok(true, "Set admin failed as expected");
        return; // Exit early — test passes
    }

    assert.fail("It was able to set admin");
}
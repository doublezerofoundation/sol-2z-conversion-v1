import { assert, expect } from "chai";
import { PublicKey, Keypair } from "@solana/web3.js";
import {Program} from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import {ConverterProgram} from "../../../target/types/converter_program";
import {delay, findAnchorEventInLogs, getTransactionLogs} from "../utils/return-data";

export async function setFillsConsumerAndVerify(
    program: Program<ConverterProgram>,
    adminKeyPair: Keypair,
    fillsConsumer: PublicKey,
) {
    try {
        const txSig = await program.methods
            .setFillsConsumer(fillsConsumer)
            .accounts({
                admin: adminKeyPair.publicKey,
            })
            .signers([adminKeyPair])
            .rpc();

        await delay(100);
        const logs = await getTransactionLogs(program.provider, txSig);        
        const event = await findAnchorEventInLogs(logs, program.idl, "fillsConsumerChanged");
        expect(event, "fillsConsumerChanged event should be emitted").to.exist;
    } catch (e) {
        console.error("Set Fills Consumer failed:", e);
        assert.fail("Set Fills Consumer failed");
    }
}
export async function setFillsConsumerExpectUnauthorized(
    program: Program<ConverterProgram>,
    nonAdmin: Keypair,
    fillsConsumer: PublicKey
) {
    try {
        await program.methods
            .setFillsConsumer(fillsConsumer)
            .accounts({
                admin: nonAdmin.publicKey,
            })
            .signers([nonAdmin])
            .rpc();

        // If we get here, no error was thrown => test should fail
        assert.fail("Expected Unauthorized error but transaction succeeded");
    } catch (e) {
        // Check for Unauthorized event in error logs
        if (e.logs) {
            const event = findAnchorEventInLogs(e.logs, program.idl, "unauthorizedUser");
            expect(event, "Unauthorized event should be emitted").to.exist;
        } else {
            assert.fail("No logs found in error object");
        }
        // AnchorError includes error logs and errorCode
        const anchorErr = e as anchor.AnchorError;
        assert.equal(anchorErr.error.errorCode.code, "UnauthorizedAdmin");
    }
}
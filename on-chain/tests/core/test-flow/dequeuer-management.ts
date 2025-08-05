import {
    getConfigurationRegistryPDA,
    getProgramStatePDA
} from "../utils/pda-helper";

import { assert, expect } from "chai";
import { PublicKey, Keypair } from "@solana/web3.js";
import { BorshCoder } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { Buffer } from "buffer";

/**
 * Helper: parse event logs from transaction metadata
 */
async function getTransactionLogs(provider, txSig: string) {
    const tx = await provider.connection.getTransaction(txSig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
    });
    return tx?.meta?.logMessages || [];
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function findAnchorEventInLogs(logs: string[], idl: any, eventName: string): any | null {
    const programDataLogs = logs.filter((line) => line.startsWith("Program data:"));
    const coder = new BorshCoder(idl);
    for (const log of programDataLogs) {
        const base64Data = log.split("Program data: ")[1];
        const buffer = Buffer.from(base64Data, "base64");
        try {
            const event = coder.events.decode(buffer as any);
            if (event && event.name === eventName) {
                return event;
            }
        } catch (err) {
            // Not an event or decode failed
        }
    }
    return null;
}

export async function addDequeuerAndVerify(
    program,
    adminKeyPair: Keypair,
    dequeuer: PublicKey,
    expectEvent: boolean = true
) {

    try {

        const programStateAccount = await getProgramStatePDA(program.programId);
        const configRegistryAccount = await getConfigurationRegistryPDA(program.programId);

        const txSig = await program.methods
            .addDequeuer(dequeuer)
            .accounts({
                configurationRegistry: configRegistryAccount,
                programState: programStateAccount,
                admin: adminKeyPair.publicKey,
            })
            .signers([adminKeyPair])
            .rpc();

        // console.log("Add Dequeuer successful. Transaction Hash", txSig);
        await sleep(100);
        const logs = await getTransactionLogs(program.provider, txSig);        
        const event = await findAnchorEventInLogs(logs, program.idl, "dequeuerAdded");
        if (event) {
            //console.log("Decoded event:", event);
        }        
        if (expectEvent) {
            expect(event, "dequeuerAdded event should be emitted").to.exist;
        } else {
            expect(event, "dequeuerAdded event should NOT be emitted").to.not.exist;
        }

    } catch (e) {
        console.error("Add Dequeuer failed:", e);
        assert.fail("Add Dequeuer failed");
    }
}

export async function removeDequeuerAndVerify(
    program,
    adminKeyPair: Keypair,
    dequeuer: PublicKey,
    expectEvent: boolean = true
) {
    try {
        const programStateAccount = await getProgramStatePDA(program.programId);
        const configRegistryAccount = await getConfigurationRegistryPDA(program.programId);

        const txSig = await program.methods
            .removeDequeuer(dequeuer)
            .accounts({
                configurationRegistry: configRegistryAccount,
                programState: programStateAccount,
                admin: adminKeyPair.publicKey,
            })
            .signers([adminKeyPair])
            .rpc();


        // console.log("Remove Dequeuer successful. Transaction Hash", txSig);

        await sleep(100);
        const logs = await getTransactionLogs(program.provider, txSig);        
        const event = await findAnchorEventInLogs(logs, program.idl, "dequeuerRemoved");
        if (event) {
            // console.log("Decoded event:", event);
        }        
        if (expectEvent) {
            expect(event, "dequeuerRemoved event should be emitted").to.exist;
        } else {
            expect(event, "dequeuerRemoved event should NOT be emitted").to.not.exist;
        }
    } catch (e) {
        console.error("Remove Dequeuer failed:", e);
        assert.fail("Remove Dequeuer failed");
    }
}

export async function addDequeuerExpectUnauthorized(
    program,
    nonAdmin: Keypair,
    dequeuer: PublicKey
) {
    try {
        const programStateAccount = await getProgramStatePDA(program.programId);
        const configRegistryAccount = await getConfigurationRegistryPDA(program.programId);
        await program.methods
            .addDequeuer(dequeuer)
            .accounts({
                configurationRegistry: configRegistryAccount,
                programState: programStateAccount,
                admin: nonAdmin.publicKey,
            })
            .signers([nonAdmin])
            .rpc();

        // If we get here, no error was thrown => test should fail
        assert.fail("Expected Unauthorized error but transaction succeeded");
    } catch (e) {
        // Check for Unauthorized event in error logs
        if (e.logs) {
            console.log(e.logs);
            const event = findAnchorEventInLogs(e.logs, program.idl, "unauthorizedUser");
            expect(event, "Unauthorized event should be emitted").to.exist;
            if (event) {
                // console.log("Decoded event:", event);
            }
        } else {
            console.log("No logs found in error object");
        }
        // AnchorError includes error logs and errorCode
        const anchorErr = e as anchor.AnchorError;
        assert.equal(anchorErr.error.errorCode.code, "UnauthorizedAdmin");
    }
}

export async function removeDequeuerExpectUnauthorized(
    program,
    nonAdmin: Keypair,
    dequeuer: PublicKey
) {
    try {
        const programStateAccount = await getProgramStatePDA(program.programId);
        const configRegistryAccount = await getConfigurationRegistryPDA(program.programId);

        const txSig = await program.methods
            .removeDequeuer(dequeuer)
            .accounts({
                configurationRegistry: configRegistryAccount,
                programState: programStateAccount,
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
            if (event) {
                //console.log("Decoded event:", event);
            }
        } else {
            console.log("No logs found in error object");
        }
        // AnchorError includes error logs and errorCode
        const anchorErr = e as anchor.AnchorError;
        assert.equal(anchorErr.error.errorCode.code, "UnauthorizedAdmin");
    }
}

export async function addDequeuerExpectMaxLimit(program, adminKeyPair, dequeuerList) {
    let txSig;
    try {
        const programStateAccount = await getProgramStatePDA(program.programId);
        const configRegistryAccount = await getConfigurationRegistryPDA(program.programId);
        // Add up to the max limit
        for (let i = 0; i < dequeuerList.length; i++) {
            await program.methods
                .addDequeuer(dequeuerList[i])
                .accounts({
                    configurationRegistry: configRegistryAccount,
                    programState: programStateAccount,
                    admin: adminKeyPair.publicKey,
                })
                .signers([adminKeyPair])
                .rpc();
                process.stdout.write('.'); 
        }
        console.log("");
        //Try to add one more, should fail
        const extraDequeuer = anchor.web3.Keypair.generate().publicKey;
        txSig = await program.methods
            .addDequeuer(extraDequeuer)
            .accounts({
                configurationRegistry: configRegistryAccount,
                programState: programStateAccount,
                admin: adminKeyPair.publicKey,
            })
            .signers([adminKeyPair])
            .rpc();

        console.log("Test failed: Added more than max authorized dequeuers");
        assert.fail("Expected MaxAuthorizedDequeuersReached error but transaction succeeded");
    } catch (e) {
        // Check for custom error code
        const anchorErr = e as anchor.AnchorError;
        assert.equal(anchorErr.error.errorCode.code, "MaxAuthorizedDequeuersReached");
    }
}
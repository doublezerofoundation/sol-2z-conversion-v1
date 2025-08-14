import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";
import { getDenyListRegistryPDA } from "../utils/pda-helper";
import { getDefaultKeyPair } from "../utils/accounts";
import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../../../target/types/converter_program";

export async function addToDenyListAndVerify(
    program: Program<ConverterProgram>,
    addressToAdd: PublicKey,
    authorityKeyPair: Keypair = getDefaultKeyPair()
) {
    const denyListRegistryPda = getDenyListRegistryPDA(program.programId);
    
    // Get deny list before adding
    const denyListBefore = await program.account.denyListRegistry.fetch(denyListRegistryPda);
    const beforeCount = denyListBefore.deniedAddresses.length;
    const beforeUpdateCount = denyListBefore.updateCount;
    
    // Verify address is not already in the list
    const isAlreadyDenied = denyListBefore.deniedAddresses.some(addr => addr.equals(addressToAdd));
    assert.isFalse(isAlreadyDenied, "Address should not already be in deny list");
    
    // Add to deny list
    const tx = await program.methods.addToDenyList(addressToAdd)
        .accounts({
            admin: authorityKeyPair.publicKey,
        })
        .signers([authorityKeyPair])
        .rpc();
    
    // Verify the addition
    const denyListAfter = await program.account.denyListRegistry.fetch(denyListRegistryPda);
    
    assert.equal(denyListAfter.deniedAddresses.length, beforeCount + 1, "Deny list size should increase by 1");
    assert.equal(denyListAfter.updateCount.toNumber(), beforeUpdateCount.toNumber() + 1, "Update count should increase by 1");
    
    const isNowDenied = denyListAfter.deniedAddresses.some(addr => addr.equals(addressToAdd));
    assert.isTrue(isNowDenied, "Address should now be in deny list");
    
    // Verify timestamp was updated
    assert.isAbove(denyListAfter.lastUpdated.toNumber(), 0, "Last updated timestamp should be set");
    
    return tx;
}

export async function addToDenyListShouldFail(
    program: Program<ConverterProgram>,
    addressToAdd: PublicKey,
    expectedError: string,
    authorityKeyPair: Keypair = getDefaultKeyPair()
) {
    try {
        await program.methods.addToDenyList(addressToAdd)
            .accounts({
                admin: authorityKeyPair.publicKey,
            })
            .signers([authorityKeyPair])
            .rpc();
        
        assert.fail("Expected transaction to fail");
    } catch (error) {
        console.log(error.message);
        assert.include(error.message, expectedError, `Expected error containing "${expectedError}"`);
    }
}

export async function removeFromDenyListAndVerify(
    program: Program<ConverterProgram>,
    addressToRemove: PublicKey,
    authorityKeyPair: Keypair = getDefaultKeyPair()
) {
    const denyListRegistryPda = getDenyListRegistryPDA(program.programId);
    
    // Get deny list before removing
    const denyListBefore = await program.account.denyListRegistry.fetch(denyListRegistryPda);
    const beforeCount = denyListBefore.deniedAddresses.length;
    const beforeUpdateCount = denyListBefore.updateCount;
    
    // Verify address is in the list
    const isDenied = denyListBefore.deniedAddresses.some((addr: { equals: (arg0: PublicKey) => any; }) => addr.equals(addressToRemove));
    assert.isTrue(isDenied, "Address should be in deny list before removal");
    
    // Remove from deny list
    const tx = await program.methods.removeFromDenyList(addressToRemove)
        .accounts({
            admin: authorityKeyPair.publicKey,
        })
        .signers([authorityKeyPair])
        .rpc();
    
    // Verify the removal
    const denyListAfter = await program.account.denyListRegistry.fetch(denyListRegistryPda);
    
    assert.equal(denyListAfter.deniedAddresses.length, beforeCount - 1, "Deny list size should decrease by 1");
    assert.equal(denyListAfter.updateCount.toNumber(), beforeUpdateCount.toNumber() + 1, "Update count should increase by 1");
    
    const isStillDenied = denyListAfter.deniedAddresses.some(addr => addr.equals(addressToRemove));
    assert.isFalse(isStillDenied, "Address should no longer be in deny list");
    
    // Verify timestamp was updated
    assert.isAtLeast(denyListAfter.lastUpdated.toNumber(), denyListBefore.lastUpdated.toNumber(), "Last updated timestamp should be at least as recent");
    
    return tx;
}

export async function removeFromDenyListShouldFail(
    program: Program<ConverterProgram>,
    addressToRemove: PublicKey,
    expectedError: string,
    authorityKeyPair: Keypair = getDefaultKeyPair()
) {
    try {
        await program.methods.removeFromDenyList(addressToRemove)
            .accounts({
                admin: authorityKeyPair.publicKey,
            })
            .signers([authorityKeyPair])
            .rpc();
        
        assert.fail("Expected transaction to fail");
    } catch (error) {
        assert.include(error.message, expectedError, `Expected error containing "${expectedError}"`);
    }
}

export async function fetchDenyListRegistry(program: Program<ConverterProgram>) {
    const denyListRegistryPda = getDenyListRegistryPDA(program.programId);
    return await program.account.denyListRegistry.fetch(denyListRegistryPda);
}

export async function verifyDenyListState(
    program: Program<ConverterProgram>,
    expectedAddresses: PublicKey[],
    expectedUpdateCount?: number
) {
    const denyList = await fetchDenyListRegistry(program);
    
    assert.equal(denyList.deniedAddresses.length, expectedAddresses.length, "Deny list should have expected number of addresses");
    
    for (const expectedAddr of expectedAddresses) {
        const isPresent = denyList.deniedAddresses.some(addr => addr.equals(expectedAddr));
        assert.isTrue(isPresent, `Address ${expectedAddr.toString()} should be in deny list`);
    }
    
    if (expectedUpdateCount !== undefined) {
        assert.equal(denyList.updateCount.toNumber(), expectedUpdateCount, "Update count should match expected value");
    }
    
    return denyList;
}

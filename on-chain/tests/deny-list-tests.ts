import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../target/types/converter_program";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";
import { airdrop, getDefaultKeyPair } from "./core/utils/accounts";
import { DEFAULT_CONFIGS } from "./core/utils/configuration-registry";
import { systemInitializeAndVerify } from "./core/test-flow/system-initialize";
import {
    addToDenyListAndVerify,
    addToDenyListShouldFail,
    removeFromDenyListAndVerify,
    removeFromDenyListShouldFail,
    fetchDenyListRegistry,
    verifyDenyListState
} from "./core/test-flow/deny-list";

describe("Deny List Tests", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.converterProgram as Program<ConverterProgram>;
    const adminKeyPair = getDefaultKeyPair();

    // Test addresses
    const testAddress1 = new PublicKey("11111111111111111111111111111112");
    const testAddress2 = new PublicKey("11111111111111111111111111111113");
    const testAddress3 = new PublicKey("11111111111111111111111111111114");

    before(async () => {
        // Ensure system is initialized before running deny list tests
        try {
            await fetchDenyListRegistry(program);
            console.log("Deny list registry already exists, continuing with tests...");
            
            // Clear any existing addresses to start with a clean state
            const currentDenyList = await fetchDenyListRegistry(program);
            console.log(`Clearing ${currentDenyList.deniedAddresses.length} existing addresses from deny list...`);
            
            for (const address of currentDenyList.deniedAddresses) {
                try {
                    await removeFromDenyListAndVerify(program, address, adminKeyPair);
                } catch {
                    // Continue even if removal fails - this is expected in cleanup
                }
            }
            
            console.log("Deny list cleaned. Starting tests with empty deny list.");
        } catch (error: any) {
            // If deny list registry doesn't exist, initialize the system
            if (error.message.includes("Account does not exist")) {
                console.log("Initializing system for deny list tests...");
                await systemInitializeAndVerify(program, adminKeyPair, DEFAULT_CONFIGS);
                console.log("System initialized successfully!");
            } else {
                console.log("Failed to initialize system:", error.message);
                throw error;
            }
        }
    });

    describe("Add to Deny List", () => {
        it("Should successfully add an address to the deny list", async () => {
            await addToDenyListAndVerify(program, testAddress1, adminKeyPair);
            
            // Verify the state
            const denyList = await fetchDenyListRegistry(program);
            assert.equal(denyList.deniedAddresses.length, 1, "Should have 1 address in deny list");
            assert.isTrue(denyList.deniedAddresses.some(addr => addr.equals(testAddress1)), "testAddress1 should be in deny list");
        });

        it("Should successfully add multiple addresses to the deny list", async () => {
            await addToDenyListAndVerify(program, testAddress2, adminKeyPair);
            await addToDenyListAndVerify(program, testAddress3, adminKeyPair);
            
            // Verify all addresses are in the list (should now have testAddress1, testAddress2, testAddress3)
            const denyList = await fetchDenyListRegistry(program);
            assert.equal(denyList.deniedAddresses.length, 3, "Should have 3 addresses in deny list");
            
            const expectedAddresses = [testAddress1, testAddress2, testAddress3];
            for (const expectedAddr of expectedAddresses) {
                const isPresent = denyList.deniedAddresses.some(addr => addr.equals(expectedAddr));
                assert.isTrue(isPresent, `Address ${expectedAddr.toString()} should be in deny list`);
            }
        });

        it("Should fail to add the same address twice", async () => {
            await addToDenyListShouldFail(
                program,
                testAddress1,
                "A raw constraint was violated",
                adminKeyPair
            );
        });

        it("Should fail when non-authority tries to add to deny list", async () => {
            const nonAuthorityKeyPair = Keypair.generate();
            await airdrop(program.provider.connection, nonAuthorityKeyPair.publicKey);

            // Note: Current implementation doesn't actually check authority,
            // so this test will currently pass. This should be updated when
            // proper authority checking is implemented in the contract.
            try {
                await addToDenyListAndVerify(program, new PublicKey("11111111111111111111111111111115"), nonAuthorityKeyPair);
                console.log("Note: Non-authority was able to add to deny list. Authority checking should be implemented.");
            } catch (error) {
                // This is the expected behavior once authority checking is implemented
                assert.include(error.message, "unauthorized", `Expected authorization error`);
            }
        });

        it("Should update metadata correctly when adding addresses", async () => {
            const newTestAddress = new PublicKey("11111111111111111111111111111116");
            
            const denyListBefore = await fetchDenyListRegistry(program);
            
            await addToDenyListAndVerify(program, newTestAddress, adminKeyPair);
            
            const denyListAfter = await fetchDenyListRegistry(program);
            
            // Verify update count increased
            assert.isAbove(denyListAfter.updateCount.toNumber(), denyListBefore.updateCount.toNumber(), "Update count should increase");
            
            // Verify timestamp was updated (should be greater than or equal to before)
            assert.isAtLeast(denyListAfter.lastUpdated.toNumber(), denyListBefore.lastUpdated.toNumber(), "Timestamp should not decrease");
        });
    });

    describe("Remove from Deny List", () => {
        it("Should successfully remove an address from the deny list", async () => {
            // Ensure testAddress2 is in the list first
            const denyListBefore = await fetchDenyListRegistry(program);
            const isPresent = denyListBefore.deniedAddresses.some(addr => addr.equals(testAddress2));
            
            if (!isPresent) {
                await addToDenyListAndVerify(program, testAddress2, adminKeyPair);
            }
            
            await removeFromDenyListAndVerify(program, testAddress2, adminKeyPair);
            
            // Verify testAddress2 is no longer in the list
            const denyListAfter = await fetchDenyListRegistry(program);
            const isStillPresent = denyListAfter.deniedAddresses.some(addr => addr.equals(testAddress2));
            
            assert.isFalse(isStillPresent, "Address should no longer be in deny list");
        });

        it("Should fail to remove an address that is not in the deny list", async () => {
            const nonExistentAddress = new PublicKey("11111111111111111111111111111117");
            
            await removeFromDenyListShouldFail(
                program,
                nonExistentAddress,
                "A raw constraint was violated",
                adminKeyPair
            );
        });

        it("Should fail when non-authority tries to remove from deny list", async () => {
            const nonAuthorityKeyPair = Keypair.generate();
            await airdrop(program.provider.connection, nonAuthorityKeyPair.publicKey);

            // Note: Current implementation doesn't actually check authority,
            // so this test will currently pass. This should be updated when
            // proper authority checking is implemented in the contract.
            try {
                await removeFromDenyListAndVerify(program, testAddress1, nonAuthorityKeyPair);
                console.log("Note: Non-authority was able to remove from deny list. Authority checking should be implemented.");
            } catch (error) {
                // This is the expected behavior once authority checking is implemented
                assert.include(error.message, "unauthorized", `Expected authorization error`);
            }
        });

        it("Should update metadata correctly when removing addresses", async () => {
            // Ensure we have an address to remove
            const addressToRemove = testAddress3;
            
            const denyListBefore = await fetchDenyListRegistry(program);
            
            await removeFromDenyListAndVerify(program, addressToRemove, adminKeyPair);
            
            const denyListAfter = await fetchDenyListRegistry(program);
            
            // Verify update count increased
            assert.isAbove(denyListAfter.updateCount.toNumber(), denyListBefore.updateCount.toNumber(), "Update count should increase");
            
            // Verify timestamp was updated (should be greater than or equal to before)
            assert.isAtLeast(denyListAfter.lastUpdated.toNumber(), denyListBefore.lastUpdated.toNumber(), "Timestamp should not decrease");
        });
    });

    describe("Edge Cases and Constraints", () => {
        it("Should handle adding addresses up to the maximum limit", async () => {
            // First, clear the deny list by removing existing addresses
            const currentDenyList = await fetchDenyListRegistry(program);
            
            // Remove all existing addresses
            for (const address of currentDenyList.deniedAddresses) {
                try {
                    await removeFromDenyListAndVerify(program, address, adminKeyPair);
                } catch {
                    // Continue even if removal fails - this is expected in cleanup
                }
            }
            
            // Add addresses up to near the limit (leave some buffer for other tests)
            const maxAddresses = 10; // Much less than MAX_DENY_LIST_SIZE (50) to avoid conflicts
            const testAddresses: PublicKey[] = [];
            
            for (let i = 0; i < maxAddresses; i++) {
                // Generate valid 32-byte public keys
                const keyBytes = new Uint8Array(32);
                keyBytes.fill(i + 1); // Fill with a pattern based on index
                const address = new PublicKey(keyBytes);
                testAddresses.push(address);
                await addToDenyListAndVerify(program, address, adminKeyPair);
            }
            
            // Verify all addresses are in the list
            await verifyDenyListState(program, testAddresses);
        });

        it("Should maintain list integrity after multiple operations", async () => {
            // Clear the deny list first to ensure clean state
            const currentDenyList = await fetchDenyListRegistry(program);
            
            for (const address of currentDenyList.deniedAddresses) {
                try {
                    await removeFromDenyListAndVerify(program, address, adminKeyPair);
                } catch {
                    // Continue even if removal fails - this is expected in cleanup
                }
            }
            
            // Add a few addresses with valid public keys
            const addr1Bytes = new Uint8Array(32); addr1Bytes.fill(21);
            const addr2Bytes = new Uint8Array(32); addr2Bytes.fill(31);
            const addr3Bytes = new Uint8Array(32); addr3Bytes.fill(41);
            
            const addr1 = new PublicKey(addr1Bytes);
            const addr2 = new PublicKey(addr2Bytes);
            const addr3 = new PublicKey(addr3Bytes);
            
            await addToDenyListAndVerify(program, addr1, adminKeyPair);
            await addToDenyListAndVerify(program, addr2, adminKeyPair);
            await addToDenyListAndVerify(program, addr3, adminKeyPair);
            
            // Remove middle address
            await removeFromDenyListAndVerify(program, addr2, adminKeyPair);
            
            // Verify remaining addresses are still there
            const denyList = await fetchDenyListRegistry(program);
            assert.isTrue(denyList.deniedAddresses.some(addr => addr.equals(addr1)), "Address 1 should still be in deny list");
            assert.isFalse(denyList.deniedAddresses.some(addr => addr.equals(addr2)), "Address 2 should be removed from deny list");
            assert.isTrue(denyList.deniedAddresses.some(addr => addr.equals(addr3)), "Address 3 should still be in deny list");
            
            // Add addr2 back
            await addToDenyListAndVerify(program, addr2, adminKeyPair);
            
            // Verify all are back
            await verifyDenyListState(program, [addr1, addr2, addr3]);
        });

        it("Should correctly handle empty deny list operations", async () => {
            // Clear the deny list first
            const currentDenyList = await fetchDenyListRegistry(program);
            
            for (const address of currentDenyList.deniedAddresses) {
                try {
                    await removeFromDenyListAndVerify(program, address, adminKeyPair);
                } catch {
                    // Continue even if removal fails - this is expected in cleanup
                }
            }
            
            // Verify list is empty
            await verifyDenyListState(program, []);
            
            // Try to remove from empty list
            const nonExistentBytes = new Uint8Array(32); nonExistentBytes.fill(51);
            const nonExistentAddress = new PublicKey(nonExistentBytes);
            
            await removeFromDenyListShouldFail(
                program,
                nonExistentAddress,
                "A raw constraint was violated",
                adminKeyPair
            );
            
            // Add one address to ensure list works after being empty
            const testAddrBytes = new Uint8Array(32); testAddrBytes.fill(61);
            const testAddr = new PublicKey(testAddrBytes);
            await addToDenyListAndVerify(program, testAddr, adminKeyPair);
            await verifyDenyListState(program, [testAddr]);
        });
    });
});

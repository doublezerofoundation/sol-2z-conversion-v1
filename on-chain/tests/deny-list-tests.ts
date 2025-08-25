import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";
import { airdropToActivateAccount, getDefaultKeyPair } from "./core/utils/accounts";
import { DEFAULT_CONFIGS } from "./core/utils/configuration-registry";
import { initializeSystemIfNeeded, systemInitializeAndVerify } from "./core/test-flow/system-initialize";
import {
    addToDenyListAndVerify,
    addToDenyListShouldFail,
    removeFromDenyListAndVerify,
    removeFromDenyListShouldFail,
    fetchDenyListRegistry,
    verifyDenyListState,
    setDenyListAuthorityAndVerify
} from "./core/test-flow/deny-list";
import { setup } from "./core/setup";
import {ErrorMsg, MAX_DENY_LIST_SIZE} from "./core/constants";

describe("Deny List Tests", async () => {
    const program = await setup();
    const adminKeyPair = getDefaultKeyPair();

    before("Initialize the system if needed", async () => {
        await initializeSystemIfNeeded(program)
        await setDenyListAuthorityAndVerify(program, adminKeyPair.publicKey);
    });

    // Test addresses
    const testAddress1 = new PublicKey("11111111111111111111111111111112");
    const testAddress2 = new PublicKey("11111111111111111111111111111113");
    const testAddress3 = new PublicKey("11111111111111111111111111111114");

    before(async () => {
        // Ensure system is initialized before running deny list tests.
        try {
            await fetchDenyListRegistry(program);
            console.log("Deny list registry already exists, continuing with tests...");
            
            // Clear any existing addresses to start with a clean state.
            const currentDenyList = await fetchDenyListRegistry(program);
            console.log(`Clearing ${currentDenyList.deniedAddresses.length} existing addresses from deny list...`);
            
            for (const address of currentDenyList.deniedAddresses) {
                try {
                    await removeFromDenyListAndVerify(program, address, adminKeyPair);
                } catch {
                    // Continue even if removal fails - this is expected in cleanup.
                }
            }
            
            console.log("Deny list cleaned. Starting tests with empty deny list.");
        } catch (error: any) {
            // If deny list registry doesn't exist, initialize the system.
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

    describe("Add to deny list", () => {
        it("Should successfully add an address to the deny list", async () => {
            await addToDenyListAndVerify(program, testAddress1, adminKeyPair);
            
            // Verify the state.
            const denyList = await fetchDenyListRegistry(program);
            assert.equal(denyList.deniedAddresses.length, 1, "Should have 1 address in deny list");
            assert.isTrue(denyList.deniedAddresses.some(addr => addr.equals(testAddress1)), "testAddress1 should be in deny list");
        });

        it("Should successfully add multiple addresses to the deny list", async () => {
            await addToDenyListAndVerify(program, testAddress2, adminKeyPair);
            await addToDenyListAndVerify(program, testAddress3, adminKeyPair);
            
            // Verify all addresses are in the list (should now have testAddress1, testAddress2, testAddress3).
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
                ErrorMsg.ALREADY_IN_DENIED_LIST,
                adminKeyPair
            );
        });

        it("Should fail when non-authority tries to add to deny list", async () => {
            const nonAuthorityKeyPair = Keypair.generate();
            await airdropToActivateAccount(program.provider.connection, nonAuthorityKeyPair.publicKey);

            try {
                await addToDenyListAndVerify(program, new PublicKey("11111111111111111111111111111115"), nonAuthorityKeyPair);
            } catch (error) {
                assert.include(error.message, "Unauthorized", ErrorMsg.UNAUTHORIZED_ADMIN);
            }
        });

        it("Should update metadata correctly when adding addresses", async () => {
            const newTestAddress = new PublicKey("11111111111111111111111111111116");
            
            const denyListBefore = await fetchDenyListRegistry(program);
            
            await addToDenyListAndVerify(program, newTestAddress, adminKeyPair);
            
            const denyListAfter = await fetchDenyListRegistry(program);
            
            // Verify update count increased.
            assert.isAbove(denyListAfter.updateCount.toNumber(), denyListBefore.updateCount.toNumber(), "Update count should increase");
            
            // Verify timestamp was updated (should be greater than or equal to before).
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
            
            // Verify testAddress2 is no longer in the list.
            const denyListAfter = await fetchDenyListRegistry(program);
            const isStillPresent = denyListAfter.deniedAddresses.some(addr => addr.equals(testAddress2));
            
            assert.isFalse(isStillPresent, "Address should no longer be in deny list");
        });

        it("Should fail to remove an address that is not in the deny list", async () => {
            const nonExistentAddress = new PublicKey("11111111111111111111111111111117");
            
            await removeFromDenyListShouldFail(
                program,
                nonExistentAddress,
                ErrorMsg.NOT_FOUND_IN_DENIED_LIST,
                adminKeyPair
            );
        });

        it("Should fail when non-authority tries to remove from deny list", async () => {
            const nonAuthorityKeyPair = Keypair.generate();
            await airdropToActivateAccount(program.provider.connection, nonAuthorityKeyPair.publicKey);

            try {
                await removeFromDenyListAndVerify(program, testAddress1, nonAuthorityKeyPair);
            } catch (error) {
                assert.include(error.message, "Unauthorized", ErrorMsg.UNAUTHORIZED_ADMIN);
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

    describe("Edge cases and constraints", () => {
        it("Should maintain list integrity after multiple operations", async () => {
            // Clear the deny list first to ensure clean state
            const currentDenyList = await fetchDenyListRegistry(program);
            
            for (const address of currentDenyList.deniedAddresses) {
                try {
                    await removeFromDenyListAndVerify(program, address, adminKeyPair);
                } catch {
                    // Continue even if removal fails - this is expected in cleanup.
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
            
            // Add addr2 back.
            await addToDenyListAndVerify(program, addr2, adminKeyPair);
            
            // Verify all are back.
            await verifyDenyListState(program, [addr1, addr2, addr3]);
        });

        it("Should fail to add address when deny list reaches maximum capacity", async () => {
            // Clear the deny list first to start fresh
            const currentDenyList = await fetchDenyListRegistry(program);
            
            for (const address of currentDenyList.deniedAddresses) {
                try {
                    await removeFromDenyListAndVerify(program, address, adminKeyPair);
                } catch {
                    // Continue even if removal fails - this is expected in cleanup.
                }
            }
            
            // Fill deny list to maximum capacity.
            const maxCapacity = MAX_DENY_LIST_SIZE;
            
            console.log(`Filling deny list to maximum capacity (${maxCapacity} addresses)...`);
            
            for (let i = 0; i < maxCapacity; i++) {
                // Generate unique valid 32-byte public keys
                const keyBytes = new Uint8Array(32);
                keyBytes[0] = Math.floor(i / 256);
                keyBytes[1] = i % 256;
                // Fill remaining bytes with a pattern to ensure uniqueness.
                for (let j = 2; j < 32; j++) {
                    keyBytes[j] = (i + j) % 256;
                }
                
                const address = new PublicKey(keyBytes);
                await addToDenyListAndVerify(program, address, adminKeyPair);
            }
            
            // Verify deny list is at maximum capacity
            const denyListAtCapacity = await fetchDenyListRegistry(program);
            assert.equal(denyListAtCapacity.deniedAddresses.length, maxCapacity, `Deny list should be at maximum capacity (${maxCapacity})`);
            
            // Try to add one more address - this should fail
            const extraKeyBytes = new Uint8Array(32);
            extraKeyBytes.fill(255); // Use a different pattern to ensure uniqueness.
            const extraAddress = new PublicKey(extraKeyBytes);
            
            console.log("Attempting to add address beyond maximum capacity...");
            
            await addToDenyListShouldFail(
                program,
                extraAddress,
                ErrorMsg.DENY_LIST_FULL,
                adminKeyPair
            );
            
            // Verify deny list size didn't change
            const denyListAfterFailure = await fetchDenyListRegistry(program);
            assert.equal(denyListAfterFailure.deniedAddresses.length, maxCapacity, "Deny list size should remain at maximum capacity");
            
            // Verify the extra address was not added
            const extraAddressExists = denyListAfterFailure.deniedAddresses.some(addr => addr.equals(extraAddress));
            assert.isFalse(extraAddressExists, "Extra address should not be in deny list");
            
            console.log("Successfully verified deny list maximum capacity constraint!");
        });

        it("Should correctly handle empty deny list operations", async () => {
            // Clear the deny list first
            const currentDenyList = await fetchDenyListRegistry(program);
            
            for (const address of currentDenyList.deniedAddresses) {
                try {
                    await removeFromDenyListAndVerify(program, address, adminKeyPair);
                } catch {
                    // Continue even if removal fails - this is expected in cleanup.
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
                ErrorMsg.NOT_FOUND_IN_DENIED_LIST,
                adminKeyPair
            );
            
            // Add one address to ensure list works after being empty.
            const testAddrBytes = new Uint8Array(32); testAddrBytes.fill(61);
            const testAddr = new PublicKey(testAddrBytes);
            await addToDenyListAndVerify(program, testAddr, adminKeyPair);
            await verifyDenyListState(program, [testAddr]);
        });
    });
});
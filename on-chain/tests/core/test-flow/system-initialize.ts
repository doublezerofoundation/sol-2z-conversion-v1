import {
    getConfigurationRegistryPDA,
    getDenyListRegistryPDA,
    getFillsRegistryPDA,
    getProgramDataAccountPDA, getProgramStatePDA
} from "../utils/pda-helper";
import {assert, expect} from "chai";
import {Keypair} from "@solana/web3.js";
import {accountExists, getDefaultKeyPair} from "../utils/account-utils";
import {DEFAULT_CONFIGS, fetchCurrentConfiguration, SystemConfig} from "../utils/configuration-registry";

export async function systemInitializeAndVerify(
    program,
    adminKeyPair: Keypair = getDefaultKeyPair(),
    inputConfigs: SystemConfig = DEFAULT_CONFIGS
) {
    // List of Accounts to be verified
    const pdas = [
        getProgramStatePDA(program.programId),
        getConfigurationRegistryPDA(program.programId),
        getFillsRegistryPDA(program.programId),
        getDenyListRegistryPDA(program.programId),
    ];

    // Accounts to be initialized should not exist before initialization
    let [programStateExists, configRegistryExists, fillsRegistryExists, denyRegistryExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isFalse(programStateExists, "Program State Account should not exist before initialization");
    assert.isFalse(configRegistryExists, "Configuration Registry should not exist before initialization");
    assert.isFalse(fillsRegistryExists, "Fills Registry should not exist before initialization");
    assert.isFalse(denyRegistryExists, "Deny List Registry should not exist before initialization");

    // Initialization
    const programDataAccount = getProgramDataAccountPDA(program.programId);
    try {
        const tx = await program.methods.initializeSystem(
            inputConfigs.oraclePubkey,
            inputConfigs.solQuantity,
            inputConfigs.slotThreshold,
            inputConfigs.priceMaximumAge,
            inputConfigs.maxFillsStorage
        )
            .accounts({
                authority: adminKeyPair.publicKey,
                programData: programDataAccount
            })
            .signers([adminKeyPair])
            .rpc();
        console.log("System Initialization is successful. Transaction Hash", tx);
    } catch (e) {
        console.error("System initialization failed:", e);
        assert.fail("System initialization failed");
    }


    // Verify Existence of Initialized Accounts
    [programStateExists, configRegistryExists, fillsRegistryExists, denyRegistryExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isTrue(programStateExists, "Program State Account should exist after initialization");
    assert.isTrue(configRegistryExists, "Configuration Registry should exist after initialization");
    assert.isTrue(fillsRegistryExists, "Fills Registry should exist after initialization");
    assert.isTrue(denyRegistryExists, "Deny List Registry should exist after initialization");

    // Verify config values are initialized as given.
    const configInConfigRegistry = await fetchCurrentConfiguration(program);
    assert.equal(configInConfigRegistry.oraclePubkey.toString(), inputConfigs.oraclePubkey.toString());
    assert.equal(configInConfigRegistry.maxFillsStorage.toString(), inputConfigs.maxFillsStorage.toString());
    assert.equal(configInConfigRegistry.priceMaximumAge.toString(), inputConfigs.priceMaximumAge.toString());
    assert.equal(configInConfigRegistry.slotThreshold.toString(), inputConfigs.slotThreshold.toString());
    assert.equal(configInConfigRegistry.solQuantity.toString(), inputConfigs.solQuantity.toString());
}

export async function systemInitializeFail(
    program,
    adminKeyPair: Keypair = getDefaultKeyPair(),
    configRegistryValues: SystemConfig = DEFAULT_CONFIGS,
    expectedError: string
) {
    const programDataAccount = getProgramDataAccountPDA(program.programId);
    try {
        await program.methods.initializeSystem(
            configRegistryValues.oraclePubkey,
            configRegistryValues.solQuantity,
            configRegistryValues.slotThreshold,
            configRegistryValues.priceMaximumAge,
            configRegistryValues.maxFillsStorage
        )
            .accounts({
                authority: adminKeyPair.publicKey,
                programData: programDataAccount
            })
            .signers([adminKeyPair])
            .rpc();

    } catch (error) {
        console.log("System initialization is rejected as expected");
        expect((new Error(error!.toString())).message).to.include(expectedError);
        assert.ok(true, "System initialization is rejected as expected");
        return; // Exit early — test passes
    }
    assert.fail("It was able to initialize system");
}

export async function initializeSystemIfNeeded(program) {
    if (!await accountExists(program.provider.connection, await getConfigurationRegistryPDA(program.programId))) {
        const adminKeypair: Keypair = getDefaultKeyPair();
        await systemInitializeAndVerify(program, adminKeypair);
    }
}
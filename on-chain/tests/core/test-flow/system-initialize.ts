import {
    getConfigurationRegistryPDA,
    getDenyListRegistryPDA,
    getFillsRegistryPDA,
    getProgramDataAccountPDA, getProgramStatePDA, getTradeRegistryPDA
} from "../utils/pda-helper";
import {assert, expect} from "chai";
import {Keypair} from "@solana/web3.js";
import {accountExists, getDefaultKeyPair} from "../utils/accounts";
import {DEFAULT_CONFIGS, fetchCurrentConfiguration, SystemConfig} from "../utils/configuration-registry";
import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../../../target/types/converter_program";
import {toggleSystemStateAndVerify} from "./system-state";

export async function systemInitializeAndVerify(
    program: Program<ConverterProgram>,
    adminKeyPair: Keypair = getDefaultKeyPair(),
    inputConfigs: SystemConfig = DEFAULT_CONFIGS
) {
    // List of Accounts to be verified
    const pdas = [
        getProgramStatePDA(program.programId),
        getConfigurationRegistryPDA(program.programId),
        getFillsRegistryPDA(program.programId),
        getDenyListRegistryPDA(program.programId),
        getTradeRegistryPDA(program.programId)
    ];

    // Accounts to be initialized should not exist before initialization
    let [programStateExists, configRegistryExists, fillsRegistryExists, denyRegistryExists, tradeRegistryExists] =
        await Promise.all(
            pdas.map((pda) => accountExists(program.provider.connection, pda))
        );

    assert.isFalse(programStateExists, "Program State Account should not exist before initialization");
    assert.isFalse(configRegistryExists, "Configuration Registry should not exist before initialization");
    assert.isFalse(fillsRegistryExists, "Fills Registry should not exist before initialization");
    assert.isFalse(denyRegistryExists, "Deny List Registry should not exist before initialization");
    assert.isFalse(tradeRegistryExists, "Trade Registry should not exist before initialization");

    // Initialization
    const programDataAccount = getProgramDataAccountPDA(program.programId);
    try {
        const tx = await program.methods.initializeSystem(
            inputConfigs.oraclePubkey,
            inputConfigs.solQuantity,
            inputConfigs.slotThreshold,
            inputConfigs.priceMaximumAge,
            inputConfigs.maxFillsStorage,
            inputConfigs.coefficient,
            inputConfigs.maxDiscountRate,
            inputConfigs.minDiscountRate
        )
            .accounts({
                authority: adminKeyPair.publicKey,
                programData: programDataAccount
            })
            .signers([adminKeyPair])
            .rpc();
        // console.log("System Initialization is successful. Transaction Hash", tx);
    } catch (e) {
        console.error("System initialization failed:", e);
        assert.fail("System initialization failed");
    }


    // Verify Existence of Initialized Accounts
    [programStateExists, configRegistryExists, fillsRegistryExists, denyRegistryExists, tradeRegistryExists] =
        await Promise.all(
            pdas.map((pda) => accountExists(program.provider.connection, pda))
        );

    assert.isTrue(programStateExists, "Program State Account should exist after initialization");
    assert.isTrue(configRegistryExists, "Configuration Registry should exist after initialization");
    assert.isTrue(fillsRegistryExists, "Fills Registry should exist after initialization");
    assert.isTrue(denyRegistryExists, "Deny List Registry should exist after initialization");
    assert.isTrue(tradeRegistryExists, "Trade List Registry should exist after initialization");

    // Verify config values are initialized as given.
    const configInConfigRegistry = await fetchCurrentConfiguration(program);
    assert.equal(configInConfigRegistry.oraclePubkey.toString(), inputConfigs.oraclePubkey.toString());
    assert.equal(configInConfigRegistry.maxFillsStorage.toString(), inputConfigs.maxFillsStorage.toString());
    assert.equal(configInConfigRegistry.priceMaximumAge.toString(), inputConfigs.priceMaximumAge.toString());
    assert.equal(configInConfigRegistry.slotThreshold.toString(), inputConfigs.slotThreshold.toString());
    assert.equal(configInConfigRegistry.solQuantity.toString(), inputConfigs.solQuantity.toString());
    assert.equal(configInConfigRegistry.coefficient.toString(), inputConfigs.coefficient.toString());
    assert.equal(configInConfigRegistry.maxDiscountRate.toString(), inputConfigs.maxDiscountRate.toString());
    assert.equal(configInConfigRegistry.minDiscountRate.toString(), inputConfigs.minDiscountRate.toString());
}

export async function systemInitializeFail(
    program: Program<ConverterProgram>,
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
            configRegistryValues.maxFillsStorage,
            configRegistryValues.coefficient,
            configRegistryValues.maxDiscountRate,
            configRegistryValues.minDiscountRate
        )
            .accounts({
                authority: adminKeyPair.publicKey,
                programData: programDataAccount
            })
            .signers([adminKeyPair])
            .rpc();

    } catch (error) {
        // console.log("System initialization is rejected as expected");
        expect((new Error(error!.toString())).message).to.include(expectedError);
        assert.ok(true, "System initialization is rejected as expected");
        return; // Exit early — test passes
    }
    assert.fail("It was able to initialize system");
}

export async function initializeSystemIfNeeded(program: Program<ConverterProgram>) {
    const adminKeypair: Keypair = getDefaultKeyPair();
    if (!await accountExists(program.provider.connection, getConfigurationRegistryPDA(program.programId))) {
        await systemInitializeAndVerify(program, adminKeypair);

    }
    // make system to unhalted state
    try {
        await toggleSystemStateAndVerify(program, false, adminKeypair);
    } catch (error) {
        // system already in active state
    }
}
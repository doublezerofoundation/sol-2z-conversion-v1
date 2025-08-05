import {Keypair} from "@solana/web3.js";
import { accountExists, getDefaultKeyPair } from "../utils/accounts"
import { DEFAULT_CONFIGS, fetchCurrentConfiguration, SystemConfig } from "../utils/configuration-registry";
import { getConfigurationRegistryPDA, getDenyListRegistryPDA, getProgramStatePDA } from "../utils/pda-helper";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import { ConverterProgram } from "../../../target/types/converter_program";

export const updateConfigsAndVerify = async (
    program: Program<ConverterProgram>,
    adminKeypair: Keypair = getDefaultKeyPair(),
    input: SystemConfig = DEFAULT_CONFIGS
) => {
    const pdas = await Promise.all([
        getConfigurationRegistryPDA(program.programId),
        getDenyListRegistryPDA(program.programId),
        getProgramStatePDA(program.programId),
    ]);

    let [programStateExists, configRegistryExists, denyRegistryExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isTrue(programStateExists, "Program state should be initialized");
    assert.isTrue(configRegistryExists, "Config Registry should be initialized");
    assert.isTrue(denyRegistryExists, "Deny List should be initialized");

    try {
        await program.methods.updateConfigurationRegistry(input)
        .accounts({
            admin: adminKeypair.publicKey,
        })
        .signers([adminKeypair])
        .rpc();
    } catch(e) {
        console.error("Config update failed", e.errorLogs);
        assert.fail("Config update failed");
    }

    // verify whether config values were updated
    const updatedConfig = await fetchCurrentConfiguration(program);
    assert.equal(updatedConfig.oraclePubkey.toString(), input.oraclePubkey.toString());
    assert.equal(updatedConfig.maxFillsStorage.toString(), input.maxFillsStorage.toString());
    assert.equal(updatedConfig.priceMaximumAge.toString(), input.priceMaximumAge.toString());
    assert.equal(updatedConfig.slotThreshold.toString(), input.slotThreshold.toString());
    assert.equal(updatedConfig.solQuantity.toString(), input.solQuantity.toString());
}

export const updateConfigsAndVerifyFail = async (
    program: Program<ConverterProgram>,
    adminKeypair: Keypair = getDefaultKeyPair(),
    input: SystemConfig | any = DEFAULT_CONFIGS,
    expectedError: string
) => {
    const pdas = await Promise.all([
        getConfigurationRegistryPDA(program.programId),
        getDenyListRegistryPDA(program.programId),
        getProgramStatePDA(program.programId),
    ]);

    let [programStateExists, configRegistryExists, denyRegistryExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isTrue(programStateExists, "Program state should be initialized");
    assert.isTrue(configRegistryExists, "Config Registry should be initialized");
    assert.isTrue(denyRegistryExists, "Deny List should be initialized");

    try {
        await program.methods.updateConfigurationRegistry(input)
        .accounts({
            admin: adminKeypair.publicKey,
        })
        .signers([adminKeypair])
        .rpc();
    } catch(e) {
        expect((new Error(e!.toString())).message).to.include(expectedError);
        assert.ok(true, "Config update failed as expected");
        return; // Exit early — test passes
    }
    assert.fail("It was able to update config");
}
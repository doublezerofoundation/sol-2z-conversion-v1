import {Keypair} from "@solana/web3.js";
import { accountExists, getDefaultKeyPair } from "../utils/accounts"
import { DEFAULT_CONFIGS, fetchCurrentConfiguration, SystemConfig } from "../utils/configuration-registry";
import { getConfigurationRegistryPDA, getDenyListRegistryPDA, getProgramStatePDA } from "../utils/pda-helper";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import { ConverterProgram } from "../../../target/types/converter_program";

export const updateConfigsAndVerify = async (
    program: Program<ConverterProgram>,
    input: SystemConfig = DEFAULT_CONFIGS,
    adminKeypair: Keypair = getDefaultKeyPair(),
) => {
    const pdas = [
        getConfigurationRegistryPDA(program.programId),
        getDenyListRegistryPDA(program.programId),
        getProgramStatePDA(program.programId),
    ];

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
    assert.equal(updatedConfig.coefficient.toString(), input.coefficient.toString());
    assert.equal(updatedConfig.maxDiscountRate.toString(), input.maxDiscountRate.toString());
    assert.equal(updatedConfig.minDiscountRate.toString(), input.minDiscountRate.toString());
}

export const updateConfigsAndVerifyFail = async (
    program: Program<ConverterProgram>,
    input: SystemConfig | any = DEFAULT_CONFIGS,
    expectedError: string,
    adminKeypair: Keypair = getDefaultKeyPair(),
) => {
    const pdas = [
        getConfigurationRegistryPDA(program.programId),
        getDenyListRegistryPDA(program.programId),
        getProgramStatePDA(program.programId),
    ];

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
        expect(e!.toString()).to.include(expectedError);
        assert.ok(true, "Config update failed as expected");
        return; // Exit early — test passes
    }
    assert.fail("It was able to update config");
}
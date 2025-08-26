import { setup } from "./core/setup";
import { initializeSystemIfNeeded } from "./core/test-flow/system-initialize";
import {assert, expect} from "chai";
import {accountExists, getDefaultKeyPair} from "./core/utils/accounts";
import {PublicKey} from "@solana/web3.js";
import {getConfigurationRegistryPDA, getDenyListRegistryPDA, getProgramStatePDA} from "./core/utils/pda-helper";

const CONFIGURATION_REGISTRY_SEED_V2 = "system_config_v2";
const DENY_LIST_REGISTRY_SEED_V2 = "deny_list_v2";

export function getConfigurationV2RegistryPDA(programId: PublicKey): [PublicKey, Number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(CONFIGURATION_REGISTRY_SEED_V2)],
        programId
    )
}

function getDenyListRegistryV2PDA(programId: PublicKey): [PublicKey, Number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(DENY_LIST_REGISTRY_SEED_V2)],
        programId
    )
}
describe.skip("Migration Tests", async () => {
    const program = await setup();
    const admin = getDefaultKeyPair();
    let v1BumpValues: Number[];
    const accounts: PublicKey[] = [
        getProgramStatePDA(program.programId),
        getConfigurationRegistryPDA(program.programId),
        getDenyListRegistryPDA(program.programId),
        getConfigurationV2RegistryPDA(program.programId)[0],
        getDenyListRegistryV2PDA(program.programId)[0]
    ];

    before("Initialize the system if needed", async () => {
        await initializeSystemIfNeeded(program)
    });

    it("Upgrading to V2 from V1", async () => {
        let programState = await program.account.programStateAccount.fetch(
            getProgramStatePDA(program.programId)
        );
        v1BumpValues = [programState.bumpRegistry.configurationRegistryBump, programState.bumpRegistry.denyListRegistryBump];

        let [programStateExists, configRegistryV1Exists, denyRegistryV1Exists, configRegistryV2Exists, denyRegistryV2Exists] =
            await Promise.all(
                accounts.map((pda) => accountExists(program.provider.connection, pda))
            );

        assert.isTrue(programStateExists, "Program state account should exist before migration");
        assert.isTrue(configRegistryV1Exists, "Configuration registry V1 should exist before migration");
        assert.isTrue(denyRegistryV1Exists, "Deny list registry V1 should exist before migration");
        assert.isFalse(configRegistryV2Exists, "Configuration registry V2 should not exist before migration");
        assert.isFalse(denyRegistryV2Exists, "Deny list registry V2 should not exist before migration");

        const configurationRegistryV1 = await program.account.configurationRegistry.fetch(
            getConfigurationRegistryPDA(program.programId)
        );

        const denyListV1 = await program.account.denyListRegistry.fetch(
            getDenyListRegistryPDA(program.programId)
        );

        try {
            await program.methods.migrateV1ToV2()
                .accounts({
                    admin: admin.publicKey,
                })
                .signers([admin])
                .rpc();
        } catch (e) {
            console.error("Migration failed:", e);
            assert.fail("Migration failed");
        }

        [programStateExists, configRegistryV1Exists, denyRegistryV1Exists, configRegistryV2Exists, denyRegistryV2Exists] =
            await Promise.all(
                accounts.map((pda) => accountExists(program.provider.connection, pda))
            );

        assert.isTrue(programStateExists, "Program state account should exist after migration");
        assert.isFalse(configRegistryV1Exists, "Configuration registry V1 should not exist after migration");
        assert.isFalse(denyRegistryV1Exists, "Deny list registry V1 should not exist after migration");
        assert.isTrue(configRegistryV2Exists, "Configuration registry V2 should exist after migration");
        assert.isTrue(denyRegistryV2Exists, "Deny list registry V2 should exist after migration");
        programState = await program.account.programStateAccount.fetch(
            getProgramStatePDA(program.programId)
        );
        // check bump values has been updated.
        assert.equal(programState.bumpRegistry.configurationRegistryBump, getConfigurationV2RegistryPDA(program.programId)[1]);
        assert.equal(programState.bumpRegistry.denyListRegistryBump, getDenyListRegistryV2PDA(program.programId)[1]);

        const configurationRegistryV2 = await program.account.configurationRegistryV2.fetch(
            getConfigurationV2RegistryPDA(program.programId)[0]
        );

        // assert configuration values are correctly migrated.
        assert.equal(Number(configurationRegistryV2.solAmount), Number(configurationRegistryV1.solQuantity));
        assert.equal(configurationRegistryV2.priceOraclePubkey.toBase58(), configurationRegistryV1.oraclePubkey.toBase58());
        assert.equal(configurationRegistryV2.fillsConsumer.toBase58(), configurationRegistryV1.fillsConsumer.toBase58());
        assert.equal(Number(configurationRegistryV2.priceMaximumAge), Number(configurationRegistryV1.priceMaximumAge));
        assert.equal(Number(configurationRegistryV2.coefficient), Number(configurationRegistryV1.coefficient));
        assert.equal(Number(configurationRegistryV2.maxDiscountRate), Number(configurationRegistryV1.maxDiscountRate));
        assert.equal(Number(configurationRegistryV2.minDiscountRate), Number(configurationRegistryV1.minDiscountRate));

        const denyListV2 = await program.account.denyListRegistryV2.fetch(
            getDenyListRegistryV2PDA(program.programId)[0]
        );
        // assert deny list values are correctly migrated
        assert.equal(Number(denyListV2.updateCount), Number(denyListV1.updateCount));
        assert.equal(Number(denyListV2.lastUpdated), Number(denyListV1.lastUpdated));
        assert.equal(Number(denyListV2.newField), 0);

    });

    it("Rollback to V1 from V2", async () => {
        let [programStateExists, configRegistryV1Exists, denyRegistryV1Exists, configRegistryV2Exists, denyRegistryV2Exists] =
            await Promise.all(
                accounts.map((pda) => accountExists(program.provider.connection, pda))
            );

        const configurationRegistryV2 = await program.account.configurationRegistryV2.fetch(
            getConfigurationV2RegistryPDA(program.programId)[0]
        );
        const denyListV2 = await program.account.denyListRegistryV2.fetch(
            getDenyListRegistryV2PDA(program.programId)[0]
        );

        assert.isTrue(programStateExists, "Program state account should exist before migration");
        assert.isFalse(configRegistryV1Exists, "Configuration registry V1 should not exist before migration");
        assert.isFalse(denyRegistryV1Exists, "Deny list registry V1 should not exist before migration");
        assert.isTrue(configRegistryV2Exists, "Configuration registry V2 should exist before migration");
        assert.isTrue(denyRegistryV2Exists, "Deny list registry V2 should exist before migration");

        try {
            await program.methods.rollbackV2ToV1()
                .accounts({
                    admin: admin.publicKey
                })
                .signers([admin])
                .rpc();
        } catch (e) {
            console.error("Rollback failed:", e);
            assert.fail("Rollback failed");
        }

        [programStateExists, configRegistryV1Exists, denyRegistryV1Exists, configRegistryV2Exists, denyRegistryV2Exists] =
            await Promise.all(
                accounts.map((pda) => accountExists(program.provider.connection, pda))
            );

        assert.isTrue(programStateExists, "Program State account should exist after migration");
        assert.isTrue(configRegistryV1Exists, "Configuration registry should exist after migration");
        assert.isTrue(denyRegistryV1Exists, "Deny list registry should exist after migration");
        assert.isFalse(configRegistryV2Exists, "Configuration registry should not exist after migration");
        assert.isFalse(denyRegistryV2Exists, "Deny list registry should not exist after migration");

        let programState = await program.account.programStateAccount.fetch(
            getProgramStatePDA(program.programId)
        );
        // check bump values has been updated.
        assert.equal(programState.bumpRegistry.configurationRegistryBump, v1BumpValues[0]);
        assert.equal(programState.bumpRegistry.denyListRegistryBump, v1BumpValues[1]);

        const configurationRegistryV1 = await program.account.configurationRegistry.fetch(
            getConfigurationRegistryPDA(program.programId)
        );

        // assert configuration values are correctly migrated
        assert.equal(Number(configurationRegistryV1.solQuantity), Number(configurationRegistryV2.solAmount));
        assert.equal(configurationRegistryV1.oraclePubkey.toBase58(), configurationRegistryV2.priceOraclePubkey.toBase58());
        assert.equal(configurationRegistryV1.fillsConsumer.toBase58(), configurationRegistryV2.fillsConsumer.toBase58());
        assert.equal(Number(configurationRegistryV1.priceMaximumAge), Number(configurationRegistryV2.priceMaximumAge));
        assert.equal(Number(configurationRegistryV1.coefficient), Number(configurationRegistryV2.coefficient));
        assert.equal(Number(configurationRegistryV1.maxDiscountRate), Number(configurationRegistryV2.maxDiscountRate));
        assert.equal(Number(configurationRegistryV1.minDiscountRate), Number(configurationRegistryV2.minDiscountRate));

        const denyListV1 = await program.account.denyListRegistry.fetch(
            getDenyListRegistryPDA(program.programId)
        );
        // assert deny list values are correctly migrated.
        assert.equal(Number(denyListV1.updateCount), Number(denyListV2.updateCount));
        assert.equal(Number(denyListV1.lastUpdated), Number(denyListV2.lastUpdated));
    });
});
import { setup } from "./core/setup";
import { initializeSystemIfNeeded } from "./core/test-flow/system-initialize";
import {assert} from "chai";
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
describe("Migration Tests", async () => {
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

        assert.isTrue(programStateExists, "Program State Account should exist before migration");
        assert.isTrue(configRegistryV1Exists, "Configuration Registry V1 should exist before migration");
        assert.isTrue(denyRegistryV1Exists, "Deny List Registry V1 should exist before migration");
        assert.isFalse(configRegistryV2Exists, "Configuration Registry V2 should not exist before migration");
        assert.isFalse(denyRegistryV2Exists, "Deny List Registry V2 should not exist before migration");

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

        assert.isTrue(programStateExists, "Program State Account should exist after migration");
        assert.isFalse(configRegistryV1Exists, "Configuration Registry V1 should not exist after migration");
        assert.isFalse(denyRegistryV1Exists, "Deny List Registry V1 should not exist after migration");
        assert.isTrue(configRegistryV2Exists, "Configuration Registry V2 should exist after migration");
        assert.isTrue(denyRegistryV2Exists, "Deny List Registry V2 should exist after migration");
        programState = await program.account.programStateAccount.fetch(
            getProgramStatePDA(program.programId)
        );
        // check bump values has been updated
        assert.equal(programState.bumpRegistry.configurationRegistryBump, getConfigurationV2RegistryPDA(program.programId)[1]);
        assert.equal(programState.bumpRegistry.denyListRegistryBump, getDenyListRegistryV2PDA(program.programId)[1]);

    });

    it("Rollback to V1 from V2", async () => {
        let [programStateExists, configRegistryV1Exists, denyRegistryV1Exists, configRegistryV2Exists, denyRegistryV2Exists] =
            await Promise.all(
                accounts.map((pda) => accountExists(program.provider.connection, pda))
            );

        assert.isTrue(programStateExists, "Program State Account should exist before migration");
        assert.isFalse(configRegistryV1Exists, "Configuration Registry V1 should not exist before migration");
        assert.isFalse(denyRegistryV1Exists, "Deny List Registry V1 should not exist before migration");
        assert.isTrue(configRegistryV2Exists, "Configuration Registry V2 should exist before migration");
        assert.isTrue(denyRegistryV2Exists, "Deny List Registry V2 should exist before migration");

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

        assert.isTrue(programStateExists, "Program State Account should exist after migration");
        assert.isTrue(configRegistryV1Exists, "Configuration Registry should exist after migration");
        assert.isTrue(denyRegistryV1Exists, "Deny List Registry should exist after migration");
        assert.isFalse(configRegistryV2Exists, "Configuration Registry should not exist after migration");
        assert.isFalse(denyRegistryV2Exists, "Deny List Registry should not exist after migration");

        let programState = await program.account.programStateAccount.fetch(
            getProgramStatePDA(program.programId)
        );
        // check bump values has been updated
        assert.equal(programState.bumpRegistry.configurationRegistryBump, v1BumpValues[0]);
        assert.equal(programState.bumpRegistry.denyListRegistryBump, v1BumpValues[1]);
    });
});
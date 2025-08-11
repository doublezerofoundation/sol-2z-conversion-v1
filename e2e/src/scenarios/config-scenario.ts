import { AdminClient } from "../core/admin-client";
import { CommonScenario } from "./common-scenario";
import { Config, getConfig, updateConfig } from "../core/utils/config-util";
import { assert, expect } from "chai";
import { getConfigurationRegistryAccount } from "../core/utils/account-helper";

export class ConfigScenario extends CommonScenario {
    constructor(admin: AdminClient) {
        super(admin);
    }

    public async updateConfigAndVerify(config: Config) {
        updateConfig(config);
        await this.admin.updateConfigsCommand();

        const expectedConfig = getConfig();
        const actualConfig = await getConfigurationRegistryAccount(this.admin.session.getProgram());

        expect(actualConfig.oraclePubkey.toString()).to.equal(expectedConfig.oracle_pubkey);
        expect(actualConfig.solQuantity.toString()).to.equal(expectedConfig.sol_quantity.toString());
        expect(actualConfig.slotThreshold.toString()).to.equal(expectedConfig.slot_threshold.toString());
        expect(actualConfig.maxFillsStorage.toString()).to.equal(expectedConfig.max_fills_storage.toString());
        expect(actualConfig.steepness.toString()).to.equal(expectedConfig.steepness.toString());
        expect(actualConfig.maxDiscountRate.toString()).to.equal(expectedConfig.max_discount_rate.toString());
    }

    public async updateConfigAndVerifyFail(expectedError: string) {
        try {
            await this.admin.updateConfigsCommand();
            assert.fail("Expected update config to fail");
        } catch (error) {
            this.handleExpectedError(error, expectedError);
        }
    }
}
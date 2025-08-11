import { SystemConfig } from "../core/account-defs";
import { AdminClient } from "../core/admin-client";
import { CommonScenario } from "./common-scenario";
import { getConfig, updateConfig } from "../core/utils/config-util";
import { assert, expect } from "chai";

export class ConfigScenario extends CommonScenario {
    constructor(admin: AdminClient) {
        super(admin);
    }

    public async updateConfigAndVerify(config: SystemConfig) {
        updateConfig(config);
        await this.admin.updateConfigsCommand();

        const expectedConfig = getConfig();
        const actualConfig = await this.admin.viewConfigCommand();
        expect(actualConfig).to.contain(expectedConfig.oraclePubkey.toString());
        expect(actualConfig).to.contain(expectedConfig.solQuantity.toString());
        expect(actualConfig).to.contain(expectedConfig.slotThreshold.toString());
        expect(actualConfig).to.contain(expectedConfig.priceMaximumAge.toString());
        expect(actualConfig).to.contain(expectedConfig.maxFillsStorage.toString());
        expect(actualConfig).to.contain(expectedConfig.steepness.toString());
        expect(actualConfig).to.contain(expectedConfig.maxDiscountRate.toString());
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
import { getConfig } from "../../core/utils/config-util";
import { Test } from "../../core/account-defs";
import { ConfigScenario } from "../../scenarios/config-scenario";

export const configUpdateTests: Test[] = [
    {
        name: "config_update_fail",
        description: "Non-admin should not be able to update the config",
        execute: async (scenario: ConfigScenario, invalidScenario: ConfigScenario) => {
            await invalidScenario.updateConfigAndVerifyFail("Unauthorized Admin");
        }
    },
    {
        name: "config_update",
        description: "Admin should be able to update the config",
        execute: async (scenario: ConfigScenario, invalidScenario: ConfigScenario) => {
            let config = getConfig();
            config.max_discount_rate = 3440;
            await scenario.updateConfigAndVerify(config);
        }
    },
    {
        name: "config_update_fail_invalid_max_discount_rate",
        description: "Admin should not be able to update the config with an invalid max discount rate",
        execute: async (scenario: ConfigScenario, invalidScenario: ConfigScenario) => {
            let config = getConfig();
            config.max_discount_rate = 10001;
            await scenario.updateConfigAndVerifyFail("Invalid max discount rate", config);
        }
    },
    {
        name: "config_update_fail_invalid_min_discount_rate",
        description: "Admin should not be able to update the config with an invalid min discount rate",
        execute: async (scenario: ConfigScenario, invalidScenario: ConfigScenario) => {
            let config = getConfig();
            config.max_discount_rate = 5000;
            config.min_discount_rate = 5001;
            await scenario.updateConfigAndVerifyFail("Invalid min discount rate", config);
        }
    }
]

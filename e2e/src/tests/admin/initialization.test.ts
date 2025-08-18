import { assert } from "chai";
import { Test } from "../../core/account-defs";
import { eventExists } from "../../core/utils/assertions";
import { extractTxHashFromResult } from "../../core/utils/test-helper";
import { InitializeScenario } from "../../scenarios/initialize-scenario";

export const initializationTests: Test[] = [
    {
        name: "non_deployer_init_system_fail",
        description: "Non-deployer should not be able to initialize the system",
        execute: async (scenario: any, invalidScenario: InitializeScenario) => {
            await invalidScenario.initializeSystemAndVerifyFail("");
        }
    },
    {
        name: "deployer_init_system",
        description: "Deployer should be able to initialize the system",
        execute: async (scenario: InitializeScenario) => {
            const result = await scenario.initializeSystemAndVerify();
            const txHash = extractTxHashFromResult(result);

            // SystemInitialized event should be emitted
            if (await eventExists(scenario.getConnection(), txHash, "SystemInitialized")) {
                assert.ok(true, "SystemInitialized event should be emitted");
            } else {
                assert.fail("SystemInitialized should be emitted");
            }
        }
    },
    {
        name: "deployer_reinit_system_fail",
        description: "Deployer should not be able to re-initialize the system",
        execute: async (scenario: InitializeScenario) => {
            await scenario.initializeSystemAndVerifyFail("already in use");
        }
    },
]

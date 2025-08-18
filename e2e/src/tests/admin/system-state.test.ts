import { assert } from "chai";
import { extractTxHashFromResult } from "../../core/utils/test-helper";
import { SystemStateScenario } from "../../scenarios/system-state-scenario";
import { eventExists } from "../../core/utils/assertions";
import { Test } from "../../core/account-defs";

export const systemStateTests: Test[] = [
    {
        name: "system_state_toggle_fail",
        description: "Non-admin should not be able to toggle the system state",
        execute: async (scenario: SystemStateScenario, invalidScenario: SystemStateScenario) => {
            await invalidScenario.toggleSystemStateAndVerifyFail(true, "Unauthorized Admin");
        }
    },
    {
        name: "system_state_toggle",
        description: "Admin should be able to toggle the system state",
        execute: async (scenario: SystemStateScenario, invalidScenario: SystemStateScenario) => {
            const result = await scenario.toggleSystemStateAndVerify(true);
            const txHash = extractTxHashFromResult(result);

            // SystemHalted event should be emitted
            if (await eventExists(scenario.getConnection(), txHash, "SystemHalted")) {
                assert.ok(true, "SystemHalted should be emitted");
            } else {
                assert.fail("SystemHalted event should be emitted");
            }

            const result2 = await scenario.toggleSystemStateAndVerify(false);
            const txHash2 = extractTxHashFromResult(result2);

            // SystemUnhalted event should be emitted
            if (await eventExists(scenario.getConnection(), txHash2, "SystemUnhalted")) {
                assert.ok(true, "SystemUnhalted should be emitted");
            } else {
                assert.fail("SystemUnhalted event should be emitted");
            }
        }
    },
    {
        name: "system_state_toggle_fail_invalid_state",
        description: "Admin should not be able to toggle the system state to the same state",
        execute: async (scenario: SystemStateScenario, invalidScenario: SystemStateScenario) => {
            await scenario.toggleSystemStateAndVerifyFail(false, "Invalid system state");
        }
    }
]

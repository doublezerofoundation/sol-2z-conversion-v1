import { assert } from "chai";
import { eventExists } from "../../core/utils/assertions";
import { extractTxHashFromResult } from "../../core/utils/test-helper";
import { DequeuerScenario } from "../../scenarios/fills-consumer-scenario";
import { Test } from "../../core/account-defs";

export const dequeuerTests: Test[] = [
    {
        name: "dequeuer_add_fail",
        description: "Non-admin should not be able to add a dequeuer",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            await invalidScenario.addDequeuerAndVerifyFail(dequeuer, "Unauthorized Admin");
        }
    },
    {
        name: "dequeuer_add",
        description: "Admin should be able to add a dequeuer",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            await scenario.addDequeuerAndVerify(dequeuer);
        }
    },
    {
        name: "dequeuer_add_fail_invalid_dequeuer",
        description: "Adding an invalid dequeuer should fail",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            const result = await scenario.addDequeuerAndVerify(dequeuer);
            const txHash = extractTxHashFromResult(result);

            // Check for DequeuerAdded event
            if (await eventExists(scenario.getConnection(), txHash, "DequeuerAdded")) {
                assert.fail("DequeuerAdded should not be emitted");
            } else {
                assert.ok(true, "DequeuerAdded event should not be emitted");
            }
        }
    },
    {
        name: "dequeuer_remove_fail",
        description: "Non-admin should not be able to remove a dequeuer",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            await invalidScenario.removeDequeuerAndVerifyFail(dequeuer, "Unauthorized Admin");
        }
    },
    {
        name: "dequeuer_remove",
        description: "Admin should be able to remove a dequeuer",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            await scenario.removeDequeuerAndVerify(dequeuer);
        }
    },
    {
        name: "dequeuer_remove_fail_invalid_dequeuer",
        description: "Removing an invalid dequeuer should fail",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            const result = await scenario.removeDequeuerAndVerify(dequeuer);
            const txHash = extractTxHashFromResult(result);

            // Check for DequeuerRemoved event
            if (await eventExists(scenario.getConnection(), txHash, "DequeuerRemoved")) {
                assert.fail("DequeuerRemoved should not be emitted");
            } else {
                assert.ok(true, "DequeuerRemoved event should not be emitted");
            }
        }
    }
]

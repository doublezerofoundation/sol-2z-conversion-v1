import { assert } from "chai";
import { eventExists } from "../../core/utils/assertions";
import { extractTxHashFromResult } from "../../core/utils/test-helper";
import { FillsConsumerScenario } from "../../scenarios/fills-consumer-scenario";
import { Test } from "../../core/account-defs";

export const fillsConsumerTests: Test[] = [
    {
        name: "fills_consumer_set_fail",
        description: "Non-admin should not be able to set a fills consumer",
        execute: async (scenario: FillsConsumerScenario, invalidScenario: FillsConsumerScenario, consumer: string) => {
            await invalidScenario.setFillsConsumerAndVerifyFail(consumer, "Unauthorized Admin");
        }
    },
    {
        name: "fills_consumer_set",
        description: "Admin should be able to set a fills consumer",
        execute: async (scenario: FillsConsumerScenario, invalidScenario: FillsConsumerScenario, consumer: string) => {
            await scenario.setFillsConsumerAndVerify(consumer);
        }
    },
    {
        name: "fills_consumer_set_emit_event",
        description: "Fills consumer changed event should be emitted when admin sets a fills consumer",
        execute: async (scenario: FillsConsumerScenario, invalidScenario: FillsConsumerScenario, consumer: string) => {
            const result = await scenario.setFillsConsumerAndVerify(consumer);
            const txHash = extractTxHashFromResult(result);

            if (await eventExists(scenario.getConnection(), txHash, "FillsConsumerChanged")) {
                assert.ok(true, "FillsConsumerChanged event should be emitted");
            } else {
                assert.fail("FillsConsumerChanged event should be emitted");
            }
        }
    },
    {
        name: "fills_consumer_set_fail_invalid_consumer",
        description: "Setting an invalid consumer should fail",
        execute: async (scenario: FillsConsumerScenario, invalidScenario: FillsConsumerScenario, consumer: string) => {
            await scenario.setFillsConsumerAndVerifyFail("invalid-fills-consumer-address", "Invalid");
        }
    }
]

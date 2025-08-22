import { assert, expect } from "chai";
import { Test } from "../../core/account-defs";
import { FillsConsumerScenario } from "../../scenarios/fills-consumer-scenario";
import { extractTxHashFromResult } from "../../core/utils/test-helper";
import { eventExists } from "../../core/utils/assertions";

export const fillsConsumerUserTests: Test[] = [
    {
        name: "fills_consumer_user_cannot_consume_fill_if_not_authorized",
        description: "Fills consumer user should not be able to consume a fill if they are not authorized",
        execute: async (scenario: FillsConsumerScenario) => {
            // Make sure current consumer is not authorized
            // Set admin as consumer
            await scenario.setFillsConsumer(scenario.getAdmin().session.getPublicKey());

            await scenario.consumeFillsAndVerifyFail(100, "User is not authorized to do Dequeue Action");
        }
    },
    {
        name: "fills_consumer_user_can_consume_fill",
        description: "Fills consumer user should be able to consume a fill",
        execute: async (scenario: FillsConsumerScenario) => {
            const consumer = scenario.getFillsConsumerUser();
            // Set current consumer as authorized fill consumer
            await scenario.setFillsConsumer(consumer.session.getPublicKey());

            await scenario.consumeFillsAndVerify(30);
        }
    },
    {
        name: "fills_consumed_event_should_be_emitted_when_consumer_consumes_fills",
        description: "Fills consumed event should be emitted when consumer consumes fills",
        execute: async (scenario: FillsConsumerScenario) => {
            // Consume all fills
            const result = await scenario.consumeFillsAndVerify(200);

            let txHash = extractTxHashFromResult(result);
            if (await eventExists(scenario.getConnection(), txHash, "FillsDequeued")) {
                assert.ok(true);
            } else {
                assert.fail("FillsDequeuedEvent not found");
            }
        }
    }
]
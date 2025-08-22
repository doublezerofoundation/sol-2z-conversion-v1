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
        name: "fills_dequeued_event_should_be_emitted_when_dequeuer_dequeues_fills",
        description: "Fills dequeued event should be emitted when dequeuer dequeues fills",
        execute: async (scenario: FillsConsumerScenario) => {
            // Dequeue all fills
            const result = await scenario.consumeFillsAndVerify(200);

            let txHash = extractTxHashFromResult(result);
            if (await eventExists(scenario.getConnection(), txHash, "FillsDequeuedEvent")) {
                assert.ok(true);
            } else {
                assert.fail("FillsDequeuedEvent not found");
            }
        }
    },
    {
        name: "fills_registry_should_be_updated_when_dequeuer_dequeues_fills",
        description: "Fills registry should be updated when dequeuer dequeues fills",
        execute: async (scenario: FillsConsumerScenario) => {
            const fillsRegistry = await scenario.getFillsRegistry();

            expect(fillsRegistry.total2ZPending.toNumber()).to.be.equal(0);
            expect(fillsRegistry.totalSolPending.toNumber()).to.be.equal(0);
            expect(fillsRegistry.lifetime2ZProcessed.toNumber()).to.be.greaterThan(0);
            expect(fillsRegistry.lifetimeSolProcessed.toNumber()).to.be.greaterThan(0);
            expect(fillsRegistry.head.toNumber()).to.be.equal(fillsRegistry.tail.toNumber());
        }
    }
]
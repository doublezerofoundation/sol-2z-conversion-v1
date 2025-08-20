import { assert, expect } from "chai";
import { Test } from "../../core/account-defs";
import { DequeuerScenario } from "../../scenarios/dequeuer-scenario";
import { extractTxHashFromResult } from "../../core/utils/test-helper";
import { eventExists } from "../../core/utils/assertions";

export const dequeuerUserTests: Test[] = [
    {
        name: "dequeuer_user_cannot_dequeue_fill_if_not_authorized",
        description: "Dequeuer user should not be able to dequeue a fill if they are not authorized",
        execute: async (scenario: DequeuerScenario) => {
            const dequeuer = await scenario.getDequeuerUser();

            // Make sure dequeuer is not authorized
            await scenario.removeDequeuer(dequeuer.session.getPublicKey());

            await scenario.dequeueFillsAndVerifyFail(100, "User is not authorized to do Dequeue Action");
        }
    },
    {
        name: "dequeuer_user_can_dequeue_fill",
        description: "Dequeuer user should be able to dequeue a fill",
        execute: async (scenario: DequeuerScenario) => {
            const dequeuer = await scenario.getDequeuerUser();
            // Add dequeuer to list
            await scenario.addDequeuer(dequeuer.session.getPublicKey());

            await scenario.dequeueFillsAndVerify(30);
        }
    },
    {
        name: "fills_dequeued_event_should_be_emitted_when_dequeuer_dequeues_fills",
        description: "Fills dequeued event should be emitted when dequeuer dequeues fills",
        execute: async (scenario: DequeuerScenario) => {
            // Dequeue all fills
            const result = await scenario.dequeueFillsAndVerify(200);

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
        execute: async (scenario: DequeuerScenario) => {
            const fillsRegistry = await scenario.getFillsRegistry();

            expect(fillsRegistry.total2ZPending.toNumber()).to.be.equal(0);
            expect(fillsRegistry.totalSolPending.toNumber()).to.be.equal(0);
            expect(fillsRegistry.lifetime2ZProcessed.toNumber()).to.be.greaterThan(0);
            expect(fillsRegistry.lifetimeSolProcessed.toNumber()).to.be.greaterThan(0);
            expect(fillsRegistry.head.toNumber()).to.be.equal(fillsRegistry.tail.toNumber());
        }
    }
]
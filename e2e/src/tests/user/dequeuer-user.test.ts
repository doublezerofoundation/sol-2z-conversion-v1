import { expect } from "chai";
import { Test } from "../../core/account-defs";
import { DequeuerScenario } from "../../scenarios/dequeuer-scenario";
import { BN } from "@coral-xyz/anchor";

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

            const fillsRegistry = await scenario.getFillsRegistry();

            await scenario.dequeueFillsAndVerify(200);

            const finalFillsRegistry = await scenario.getFillsRegistry();

            expect(finalFillsRegistry.lifetime2ZProcessed.toNumber()).to.be.equal(fillsRegistry.total2ZPending.toNumber());
            expect(finalFillsRegistry.lifetimeSolProcessed.toNumber()).to.be.equal(fillsRegistry.totalSolPending.toNumber());
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
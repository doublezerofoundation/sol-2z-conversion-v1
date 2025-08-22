import { CommonScenario } from "./common-scenario";
import { AdminClient } from "../core/admin-client";
import { assert, expect } from "chai";
import { getFillsConsumer } from "../core/utils/account-helper";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { UserClient } from "../core/user-client";

export class FillsConsumerScenario extends CommonScenario {
    private readonly fillsConsumer: UserClient | undefined;

    constructor(admin: AdminClient, consumer?: UserClient) {
        super(admin);
        this.fillsConsumer = consumer;
    }

    public async setFillsConsumerAndVerify(consumer: string) {
        const tx = await this.admin.setFillsConsumerCommand(consumer);

        let currentConsumer = await getFillsConsumer(this.admin.session.getProgram());

        if (currentConsumer) {
            expect(currentConsumer.toString()).to.equal(consumer);
        } else {
            assert.fail("Fills consumer is not initialized");
        }

        return tx;
    }

    public async setFillsConsumerAndVerifyFail(consumer: string, expectedError: string) {
        try {
            await this.admin.setFillsConsumerCommand(consumer);
            assert.fail("Expected set fills consumer to fail");
        } catch (error) {
            this.handleExpectedError(error, expectedError);
        }
    }

    public async consumeFillsAndVerify(maxSolValue: number): Promise<string> {
        // Get fills registry state before consumption
        const fillsBefore = await this.getFillsRegistry();

        if (!this.fillsConsumer) {
            throw new Error("Fills consumer user not set");
        }

        const tx = await this.fillsConsumer.consumeFillsCommand(maxSolValue);

        // Convert maxSolValue to lamports for comparison
        const maxSolAmountLamports = maxSolValue * LAMPORTS_PER_SOL;

        // Get fills registry state after consumption
        const fillsAfter = await this.getFillsRegistry();

        // Extract values for easier comparison
        const {
            totalSolPending: totalSolPendingBefore,
            total2ZPending: total2ZPendingBefore,
            lifetimeSolProcessed: lifetimeSolProcessedBefore,
            lifetime2ZProcessed: lifetime2ZProcessedBefore,
            fills: fillsArrayBefore,
            head: headBefore,
            tail: tailBefore,
            count: countBefore
        } = fillsBefore;

        const {
            totalSolPending: totalSolPendingAfter,
            total2ZPending: total2ZPendingAfter,
            lifetimeSolProcessed: lifetimeSolProcessedAfter,
            lifetime2ZProcessed: lifetime2ZProcessedAfter,
            fills: fillsArrayAfter,
            head: headAfter,
            tail: tailAfter,
            count: countAfter
        } = fillsAfter;

        // Calculate expected consumption based on available fills
        // Note: Only complete fills are consumed, no partial consumption
        let expectedSolConsumed = 0;
        let expected2ZConsumed = 0;
        let expectedFillsConsumed = 0;
        let currentHead = headBefore.toNumber();
        const maxFillsToCheck = countBefore.toNumber();

        // Simulate the consumption logic to determine expected values
        for (let i = 0; i < maxFillsToCheck; i++) {
            const fillIndex = (currentHead + i) % fillsArrayBefore.length;
            const fill = fillsArrayBefore[fillIndex];
            const fillSolAmount = fill.solIn.toNumber();

            // Check if adding this fill would exceed max_sol_amount
            if (expectedSolConsumed + fillSolAmount > maxSolAmountLamports) {
                // This fill would exceed the limit, so we stop here (no partial consumption)
                break;
            }

            // Consume the entire fill
            expectedSolConsumed += fillSolAmount;
            expected2ZConsumed += fill.token2zOut.toNumber();
            expectedFillsConsumed += 1;
        }

        // Validate totalSolPending: should decrease by the amount consumed
        const expectedTotalSolPending = totalSolPendingBefore.toNumber() - expectedSolConsumed;
        expect(fillsAfter.totalSolPending.toNumber()).to.equal(expectedTotalSolPending,
            "totalSolPending should decrease by the amount of SOL consumed");

        // Validate total2ZPending: should decrease by the amount consumed
        const expectedTotal2ZPending = total2ZPendingBefore.toNumber() - expected2ZConsumed;
        expect(fillsAfter.total2ZPending.toNumber()).to.equal(expectedTotal2ZPending,
            "total2ZPending should decrease by the amount of 2Z tokens consumed");

        // Validate lifetimeSolProcessed: should increase by the amount consumed
        const expectedLifetimeSolProcessed = lifetimeSolProcessedBefore.toNumber() + expectedSolConsumed;
        expect(fillsAfter.lifetimeSolProcessed.toNumber()).to.equal(expectedLifetimeSolProcessed,
            "lifetimeSolProcessed should increase by the amount of SOL consumed");

        // Validate lifetime2ZProcessed: should increase by the amount consumed
        const expectedLifetime2ZProcessed = lifetime2ZProcessedBefore.toNumber() + expected2ZConsumed;
        expect(fillsAfter.lifetime2ZProcessed.toNumber()).to.equal(expectedLifetime2ZProcessed,
            "lifetime2ZProcessed should increase by the amount of 2Z tokens consumed");

        // Validate count: should decrease by the number of fills consumed
        const expectedCount = countBefore.toNumber() - expectedFillsConsumed;
        expect(fillsAfter.count.toNumber()).to.equal(expectedCount,
            "count should decrease by the number of fills consumed");

        // Validate head: should advance by the number of fills consumed (FIFO - head points to oldest element)
        const expectedHead = (headBefore.toNumber() + expectedFillsConsumed) % fillsArrayBefore.length;
        expect(fillsAfter.head.toNumber()).to.equal(expectedHead,
            "head should advance by the number of fills consumed (FIFO - head points to oldest element)");

        // Validate tail: should remain unchanged (tail only changes when new fills are added via enqueue)
        expect(fillsAfter.tail.toNumber()).to.equal(tailBefore.toNumber(),
            "tail should remain unchanged as no new fills were added");

        // Validate fills array: consumed fills remain in memory but are no longer accessible via head pointer
        // The dequeue operation only advances the head pointer, it doesn't zero out the fills
        for (let i = 0; i < expectedFillsConsumed; i++) {
            const consumedFillIndex = (headBefore.toNumber() + i) % fillsArrayBefore.length;
            const consumedFill = fillsArrayAfter[consumedFillIndex];

            // Consumed fills should retain their original values (they're just not accessible via head pointer)
            expect(consumedFill.solIn.toNumber()).to.equal(fillsArrayBefore[consumedFillIndex].solIn.toNumber(),
                `Fill at index ${consumedFillIndex} should retain its original solIn value after consumption`);
            expect(consumedFill.token2zOut.toNumber()).to.equal(fillsArrayBefore[consumedFillIndex].token2zOut.toNumber(),
                `Fill at index ${consumedFillIndex} should retain its original token2zOut value after consumption`);
        }

        // Validate that remaining fills are unchanged
        for (let i = expectedFillsConsumed; i < countBefore.toNumber(); i++) {
            const remainingFillIndex = (headBefore.toNumber() + i) % fillsArrayBefore.length;
            const fillBefore = fillsArrayBefore[remainingFillIndex];
            const fillAfter = fillsArrayAfter[remainingFillIndex];

            expect(fillAfter.solIn.toNumber()).to.equal(fillBefore.solIn.toNumber(),
                `Remaining fill at index ${remainingFillIndex} should have unchanged solIn`);
            expect(fillAfter.token2zOut.toNumber()).to.equal(fillBefore.token2zOut.toNumber(),
                `Remaining fill at index ${remainingFillIndex} should have unchanged token2zOut`);
        }

        // Validate queue integrity: when queue has items, head and tail should be different
        if (fillsAfter.count.toNumber() > 0) {
            expect(fillsAfter.head.toNumber()).to.not.equal(fillsAfter.tail.toNumber(),
                "head and tail should be different when there are fills in the queue");
        }

        return tx;
    }

    public async consumeFillsAndVerifyFail(maxSolValue: number, expectedError: string) {
        if (!this.fillsConsumer) {
            throw new Error("Fills consumer user not set");
        }

        try {
            await this.fillsConsumer.consumeFillsCommand(maxSolValue);
            assert.fail("Expected consume fills to fail");
        } catch (error) {
            this.handleExpectedError(error, expectedError);
        }
    }

    public getFillsConsumerUser(): UserClient {
        if (!this.fillsConsumer) {
            throw new Error("Fills consumer user not set");
        }
        return this.fillsConsumer;
    }
}
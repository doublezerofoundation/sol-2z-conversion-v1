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
            fills: fillsArrayBefore,
            head: headBefore,
            tail: tailBefore,
            count: countBefore
        } = fillsBefore;

        const {
            totalSolPending: totalSolPendingAfter,
            total2ZPending: total2ZPendingAfter,
            fills: fillsArrayAfter,
            head: headAfter,
            tail: tailAfter,
            count: countAfter
        } = fillsAfter;

        // Simulate the on-chain dequeue logic to determine expected values
        let expectedSolConsumed = 0;
        let expected2ZConsumed = 0;
        let expectedFillsConsumed = 0;
        let currentHead = headBefore.toNumber();
        let remainingSol = maxSolAmountLamports;
        let fillsProcessed = 0;
        let partialFillIndex = -1;
        let partialSolConsumed = 0;

        // Process fills until max_sol_amount is reached or no more fills
        while (fillsProcessed < countBefore.toNumber() && remainingSol > 0) {
            const fillIndex = currentHead % fillsArrayBefore.length;
            const fill = fillsArrayBefore[fillIndex];
            const fillSolAmount = fill.solIn.toNumber();

            if (fillSolAmount <= remainingSol) {
                // Full dequeue - consume entire fill
                expectedSolConsumed += fillSolAmount;
                expected2ZConsumed += fill.token2ZOut.toNumber();
                expectedFillsConsumed += 1;
                remainingSol -= fillSolAmount;
                currentHead = (currentHead + 1) % fillsArrayBefore.length;
            } else {
                // Partial dequeue - consume only part of the fill
                partialSolConsumed = remainingSol;
                const partial2ZConsumed = Math.floor(
                    (fill.token2ZOut.toNumber() * partialSolConsumed) / fillSolAmount
                );

                expectedSolConsumed += partialSolConsumed;
                expected2ZConsumed += partial2ZConsumed;
                partialFillIndex = fillIndex;
                remainingSol = 0;
                // Head doesn't advance for partial consumption
            }
            
            fillsProcessed++;
        }

        // Validate totalSolPending: should decrease by the amount consumed
        const expectedTotalSolPending = totalSolPendingBefore.toNumber() - expectedSolConsumed;
        expect(fillsAfter.totalSolPending.toNumber()).to.equal(expectedTotalSolPending,
            "totalSolPending should decrease by the amount of SOL consumed");

        // Validate total2ZPending: should decrease by the amount consumed
        const expectedTotal2ZPending = total2ZPendingBefore.toNumber() - expected2ZConsumed;
        expect(fillsAfter.total2ZPending.toNumber()).to.equal(expectedTotal2ZPending,
            "total2ZPending should decrease by the amount of 2Z tokens consumed");

        // Validate count: should decrease by the number of completely consumed fills
        const expectedCount = countBefore.toNumber() - expectedFillsConsumed;
        expect(fillsAfter.count.toNumber()).to.equal(expectedCount,
            "count should decrease by the number of completely consumed fills");

        // Validate head: should advance by the number of completely consumed fills
        const expectedHead = (headBefore.toNumber() + expectedFillsConsumed) % fillsArrayBefore.length;
        expect(fillsAfter.head.toNumber()).to.equal(expectedHead,
            "head should advance by the number of completely consumed fills");

        // Validate tail: should remain unchanged (tail only changes when new fills are added via enqueue)
        expect(fillsAfter.tail.toNumber()).to.equal(tailBefore.toNumber(),
            "tail should remain unchanged as no new fills were added");

        // Validate fills array: check for partial consumption
        let currentHeadIndex = headBefore.toNumber();
        let fillsChecked = 0;

        while (fillsChecked < countBefore.toNumber()) {
            const fillIndex = currentHeadIndex % fillsArrayBefore.length;
            const fillBefore = fillsArrayBefore[fillIndex];
            const fillAfter = fillsArrayAfter[fillIndex];

            if (fillsChecked < expectedFillsConsumed) {
                // This fill was completely consumed, so head should have advanced past it
                // The fill data remains in memory but is no longer accessible via head pointer
                expect(fillAfter.solIn.toNumber()).to.equal(fillBefore.solIn.toNumber(),
                    `Completely consumed fill at index ${fillIndex} should retain its original solIn value`);
                expect(fillAfter.token2ZOut.toNumber()).to.equal(fillBefore.token2ZOut.toNumber(),
                    `Completely consumed fill at index ${fillIndex} should retain its original token2ZOut value`);
            } else if (fillIndex === partialFillIndex) {
                // This fill was partially consumed
                const expectedRemainingSol = fillBefore.solIn.toNumber() - partialSolConsumed;
                const expectedRemaining2Z = fillBefore.token2ZOut.toNumber() - Math.floor(
                    (fillBefore.token2ZOut.toNumber() * partialSolConsumed) / fillBefore.solIn.toNumber()
                );

                expect(fillAfter.solIn.toNumber()).to.equal(expectedRemainingSol,
                    `Partially consumed fill at index ${fillIndex} should have reduced solIn`);
                expect(fillAfter.token2ZOut.toNumber()).to.equal(expectedRemaining2Z,
                    `Partially consumed fill at index ${fillIndex} should have reduced token2ZOut`);
            } else {
                // This fill was not consumed at all
                expect(fillAfter.solIn.toNumber()).to.equal(fillBefore.solIn.toNumber(),
                    `Unconsumed fill at index ${fillIndex} should have unchanged solIn`);
                expect(fillAfter.token2ZOut.toNumber()).to.equal(fillBefore.token2ZOut.toNumber(),
                    `Unconsumed fill at index ${fillIndex} should have unchanged token2ZOut`);
            }

            currentHeadIndex = (currentHeadIndex + 1) % fillsArrayBefore.length;
            fillsChecked++;
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
import { CommonScenario } from "./common-scenario";
import { AdminClient } from "../core/admin-client";
import { assert, expect } from "chai";
import { getDequeuerList } from "../core/utils/account-helper";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { UserClient } from "../core/user-client";
import { getConfig } from "../core/utils/config-util";

export class DequeuerScenario extends CommonScenario {
    private readonly dequeuer: UserClient | undefined;

    constructor(admin: AdminClient, dequeuer?: UserClient) {
        super(admin);
        this.dequeuer = dequeuer;
    }

    public async addDequeuerAndVerify(dequeuer: string) {
        const tx = await this.admin.addDequeuerCommand(dequeuer);
        let dequeuers = await getDequeuerList(this.admin.session.getProgram());

        if (dequeuers) {
            let dequeuerKeys = dequeuers.map(dequeuer => dequeuer.toString());
            expect(dequeuerKeys).to.contain(dequeuer);
        } else {
            assert.fail("Dequeuers are not initialized");
        }

        return tx;
    }

    public async removeDequeuerAndVerify(dequeuer: string) {
        const tx = await this.admin.removeDequeuerCommand(dequeuer);
        const dequeuers = await getDequeuerList(this.admin.session.getProgram());

        if (dequeuers) {
            expect(dequeuers).not.to.contain(new PublicKey(dequeuer));
        } else {
            assert.fail("Dequeuers are not initialized");
        }

        return tx;
    }

    public async addDequeuerAndVerifyFail(dequeuer: string, expectedError: string) {
        try {
            await this.admin.addDequeuerCommand(dequeuer);
            assert.fail("Expected add dequeuer to fail");
        } catch (error) {
            this.handleExpectedError(error, expectedError);
        }
    }

    public async removeDequeuerAndVerifyFail(dequeuer: string, expectedError: string) {
        try {
            await this.admin.removeDequeuerCommand(dequeuer);
            assert.fail("Expected remove dequeuer to fail");
        } catch (error) {
            this.handleExpectedError(error, expectedError);
        }
    }

    public async dequeueFillsAndVerify(maxSolValue: number): Promise<string> {
        // Check if maxSolValue is less than sol quantity
        // If true, then no fills will be dequeued
        const config = getConfig();
        const solQuantity = config.sol_quantity;if (maxSolValue * LAMPORTS_PER_SOL < solQuantity) {
            throw new Error(`Max sol value ${maxSolValue} is less than sol quantity ${solQuantity}`);
        }

        const fillsRegistry = await this.getFillsRegistry();

        if (!this.dequeuer) {
            throw new Error("Dequeuer user not set");
        }

        const tx = await this.dequeuer.dequeueFillsCommand(maxSolValue);

        maxSolValue = maxSolValue * LAMPORTS_PER_SOL;
        // Multiple of solQuantity
        const expectedSolConsumption = maxSolValue - (maxSolValue % solQuantity);

        const finalFillsRegistry = await this.getFillsRegistry();

        const { total2ZPending, totalSolPending, lifetime2ZProcessed, lifetimeSolProcessed } = fillsRegistry;

        if (totalSolPending.toNumber() > expectedSolConsumption) {
            expect(finalFillsRegistry.totalSolPending.toNumber()).to.be.equal(totalSolPending.toNumber() - expectedSolConsumption);
            expect(finalFillsRegistry.lifetimeSolProcessed.toNumber()).to.be.equal(lifetimeSolProcessed.toNumber() + expectedSolConsumption);
        } else {
            expect(finalFillsRegistry.totalSolPending.toNumber()).to.be.equal(0);
            expect(finalFillsRegistry.lifetimeSolProcessed.toNumber()).to.be.equal(lifetimeSolProcessed.toNumber() + totalSolPending.toNumber());
        }

        expect(finalFillsRegistry.total2ZPending.toNumber()).to.be.lessThan(fillsRegistry.total2ZPending.toNumber());
        expect(finalFillsRegistry.lifetime2ZProcessed.toNumber()).to.be.greaterThan(fillsRegistry.lifetime2ZProcessed.toNumber());

        return tx;
    }

    public async dequeueFillsAndVerifyFail(maxSolValue: number, expectedError: string) {
        if (!this.dequeuer) {
            throw new Error("Dequeuer user not set");
        }

        try {
            await this.dequeuer.dequeueFillsCommand(maxSolValue);
            assert.fail("Expected dequeue fills to fail");
        } catch (error) {
            this.handleExpectedError(error, expectedError);
        }
    }

    public async getDequeuerUser(): Promise<UserClient> {
        if (!this.dequeuer) {
            throw new Error("Dequeuer user not set");
        }
        return this.dequeuer;
    }
}
import { CommonScenario } from "./common-scenario";
import { AdminClient } from "../core/admin-client";
import { assert, expect } from "chai";
import { getDequeuerList } from "../core/utils/account-helper";
import { PublicKey } from "@solana/web3.js";
import { UserClient } from "../core/user-client";

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
        const fillsRegistry = await this.getFillsRegistry();

        if (!this.dequeuer) {
            throw new Error("Dequeuer user not set");
        }

        const tx = await this.dequeuer.dequeueFillsCommand(maxSolValue);

        const finalFillsRegistry = await this.getFillsRegistry();

        expect(finalFillsRegistry.total2ZPending.toNumber()).to.be.lessThan(fillsRegistry.total2ZPending.toNumber());
        expect(finalFillsRegistry.totalSolPending.toNumber()).to.be.lessThan(fillsRegistry.totalSolPending.toNumber());
        expect(finalFillsRegistry.lifetime2ZProcessed.toNumber()).to.be.greaterThan(fillsRegistry.lifetime2ZProcessed.toNumber());
        expect(finalFillsRegistry.lifetimeSolProcessed.toNumber()).to.be.greaterThan(fillsRegistry.lifetimeSolProcessed.toNumber());

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
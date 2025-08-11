import { CommonScenario } from "./common-scenario";
import { AdminClient } from "../core/admin-client";
import { assert, expect } from "chai";
import { getConfigurationRegistryAccount, getDequeuerList } from "../core/utils/account-helper";
import { PublicKey } from "@solana/web3.js";

export class DequeuerScenario extends CommonScenario {
    constructor(admin: AdminClient) {
        super(admin);
    }

    public async addDequeuerAndVerify(dequeuer: string) {
        await this.admin.addDequeuerCommand(dequeuer);
        let dequeuers = await getDequeuerList(this.admin.session.getProgram());

        if (dequeuers) {
            let dequeuerKeys = dequeuers.map(dequeuer => dequeuer.toString());
            expect(dequeuerKeys).to.contain(dequeuer);
        } else {
            assert.fail("Dequeuers are not initialized");
        }
    }

    public async removeDequeuerAndVerify(dequeuer: string) {
        await this.admin.removeDequeuerCommand(dequeuer);
        const dequeuers = await getDequeuerList(this.admin.session.getProgram());

        if (dequeuers) {
            expect(dequeuers).not.to.contain(new PublicKey(dequeuer));
        } else {
            assert.fail("Dequeuers are not initialized");
        }
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
}
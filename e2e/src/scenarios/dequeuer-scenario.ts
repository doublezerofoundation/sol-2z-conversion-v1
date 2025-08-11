import { CommonScenario } from "./common-scenario";
import { AdminClient } from "../core/admin-client";
import { assert, expect } from "chai";
import { getConfigurationRegistryAccount } from "../core/utils/account-helper";
import { PublicKey } from "@solana/web3.js";

export class DequeuerScenario extends CommonScenario {
    constructor(admin: AdminClient) {
        super(admin);
    }

    public async addDequeuerAndVerify(dequeuer: string) {
        await this.admin.addDequeuerCommand(dequeuer);
        const dequeuers = (await getConfigurationRegistryAccount(this.admin.session.getProgram())).authorizedDequeuers;

        if (dequeuers) {
            expect(dequeuers).to.contain(new PublicKey(dequeuer));
        } else {
            assert.fail("Dequeuers are not initialized");
        }
    }

    public async removeDequeuerAndVerify(dequeuer: string) {
        await this.admin.removeDequeuerCommand(dequeuer);
        const dequeuers = (await getConfigurationRegistryAccount(this.admin.session.getProgram())).authorizedDequeuers;

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
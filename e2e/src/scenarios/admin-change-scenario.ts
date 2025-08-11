import { PublicKey } from "@solana/web3.js";
import { AdminClient } from "../core/admin-client";
import { CommonScenario } from "./common-scenario";
import { assert, expect } from "chai";
import { getProgramStateAccount } from "../core/utils/account-helper";

export class AdminChangeScenario extends CommonScenario {
    constructor(deployer: AdminClient) {
        super(deployer);
    }

    public async setAdminAndVerify(admin: PublicKey): Promise<void> {
        await this.deployer.setAdminCommand(admin.toString());

        // Verify that the admin is set
        const state = await getProgramStateAccount(this.deployer.session.getProgram());
        expect(state.admin.toString()).to.equal(admin.toString());
    }

    public async setAdminAndVerifyFail(admin: PublicKey, expectedError: string): Promise<void> {
        try {
            await this.deployer.setAdminCommand(admin.toString());
            assert.fail("Expected error not thrown");
        } catch (error) {
            this.handleError(error, expectedError);
        }
    }
}
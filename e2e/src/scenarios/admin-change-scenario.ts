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
        await this.admin.setAdminCommand(admin.toString());

        // Verify that the admin is set
        const state = await getProgramStateAccount(this.admin.session.getProgram());
        expect(state.admin.toString()).to.equal(admin.toString());
    }

    public async setAdminAndVerifyFail(admin: PublicKey, expectedError: string): Promise<void> {
        try {
            await this.admin.setAdminCommand(admin.toString());
            assert.fail("Expected error not thrown");
        } catch (error) {
            this.handleExpectedError(error, expectedError);
        }
    }

    public async setDenyAuthorityAndVerify(authority: PublicKey): Promise<void> {
        await this.admin.setDenyAuthorityCommand(authority.toString());

        // Verify that the deny authority is set
        const state = await getProgramStateAccount(this.admin.session.getProgram());
        expect(state.denyListAuthority.toString()).to.equal(authority.toString());
    }

    public async setDenyAuthorityAndVerifyFail(authority: PublicKey, expectedError: string): Promise<void> {
        try {
            await this.admin.setDenyAuthorityCommand(authority.toString());
            assert.fail("Expected error not thrown");
        } catch (error) {
            this.handleExpectedError(error, expectedError);
        }
    }
}
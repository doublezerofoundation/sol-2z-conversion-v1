import { PublicKey } from "@solana/web3.js";
import { AdminClient } from "../core/admin-client";
import { CommonScenario } from "./common-scenario";
import { assert, expect } from "chai";

export class DenyListScenario extends CommonScenario {
    private admin: AdminClient;
    constructor(deployer: AdminClient, admin: AdminClient) {
        super(deployer);
        this.admin = admin;
    }

    public async addUserToDenyListAndVerify(user: PublicKey): Promise<void> {
        await this.admin.addUserToDenyListCommand(user.toString());

        // Verify that the user is in the deny list
        const denyList = await this.admin.viewDenyListCommand();
        expect(denyList).to.contain(user.toString());
    }

    public async removeUserFromDenyListAndVerify(user: PublicKey): Promise<void> {
        await this.admin.removeUserFromDenyListCommand(user.toString());

        // Verify that the user is not in the deny list
        const denyList = await this.admin.viewDenyListCommand();
        expect(denyList).to.not.contain(user.toString());
    }

    public async addUserToDenyListAndVerifyFail(user: PublicKey, expectedError: string): Promise<void> {
        try {
            await this.admin.addUserToDenyListCommand(user.toString());
            assert.fail("Expected add user to deny list to fail");
        } catch (error) {
            expect(error!.toString()).to.contain(expectedError);
        }
    }

    public async removeUserFromDenyListAndVerifyFail(user: PublicKey, expectedError: string): Promise<void> {
        try {
            await this.admin.removeUserFromDenyListCommand(user.toString());
            assert.fail("Expected remove user from deny list to fail");
        } catch (error) {
            expect(error!.toString()).to.contain(expectedError);
        }
    }
}
import { CommonScenario } from "./common-scenario";
import { AdminClient } from "../core/admin-client";
import { assert, expect } from "chai";

export class WithdrawScenario extends CommonScenario {
    constructor(admin: AdminClient) {
        super(admin);
    }

    public async withdrawTokensAndVerify(amount: number, destination: string) {
        await this.admin.withdrawTokensCommand(amount, destination);
        // TODO: verify balance
        // const balance = await this.admin.getBalanceCommand(destination);
        // expect(balance).to.equal(amount);
    }

    public async withdrawTokensAndVerifyFail(amount: number, destination: string, expectedError: string) {
        try {
            await this.admin.withdrawTokensCommand(amount, destination);
            assert.fail("Expected withdraw tokens to fail");
        } catch (error) {
            this.handleExpectedError(error, expectedError);
        }
    }
}
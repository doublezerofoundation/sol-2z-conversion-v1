import { CommonScenario } from "./common-scenario";
import { AdminClient } from "../core/admin-client";
import { assert, expect } from "chai";
import { SystemState } from "../core/account-defs";

export class SystemStateScenario extends CommonScenario {
    constructor(admin: AdminClient) {
        super(admin);
    }

    public async viewSystemStateAndVerify(expectedState: SystemState) {
        const state = await this.admin.viewSystemStateCommand();
        expect(state).to.contain(expectedState.admin.toString());
        expect(state).to.contain(expectedState.isHalted.toString());
    }

    public async toggleSystemStateAndVerify(setHalted: boolean) {
        const tx = await this.admin.toggleSystemStateCommand(setHalted);
        const state = await this.admin.viewSystemStateCommand();
        expect(state).to.contain(setHalted ? "Paused" : "Active");

        return tx;
    }

    public async toggleSystemStateAndVerifyFail(setHalted: boolean, expectedError: string) {
        try {
            await this.admin.toggleSystemStateCommand(setHalted);
            assert.fail("Expected toggle system state to fail");
        } catch (error) {
            this.handleExpectedError(error, expectedError);
        }
    }
}
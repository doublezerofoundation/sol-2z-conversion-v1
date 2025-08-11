import { assert } from "chai";
import { AdminClient } from "../core/admin-client";

export abstract class CommonScenario {
    protected readonly deployer: AdminClient;

    protected constructor(deployer: AdminClient) {
        this.deployer = deployer;
    }

    public async setup(): Promise<void> {
        await this.deployer.initializeSystemCommand();
    }

    public async handleError(error: any, expectedError: string): Promise<void> {
        if (!error!.toString().includes(expectedError)) {
            console.log(error!.toString());
            assert.fail(`Expected error not thrown: ${expectedError}`);
        }
    }
}
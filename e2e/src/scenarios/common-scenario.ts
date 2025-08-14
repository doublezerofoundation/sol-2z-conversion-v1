import { AdminClient } from "../core/admin-client";
import { Connection } from "@solana/web3.js";
import { assert } from "chai";

export abstract class CommonScenario {
    protected readonly admin: AdminClient;

    protected constructor(admin: AdminClient) {
        this.admin = admin;
    }

    public async setup(): Promise<void> {
        await this.admin.initializeSystemCommand();
    }

    public handleExpectedError(error: any, expectedError: string) {
        if (!error!.toString().includes(expectedError)) {
            console.log(error!.toString());
            this.admin.session.logSessionInfo();
            assert.fail(`Expected error not thrown: ${expectedError}`);
        }
    }

    public getConnection(): Connection {
        return this.admin.session.getConnection();
    }
}
import { AdminClient } from "../core/admin-client";
import { UserClient } from "../core/user-client";

export abstract class CommonScenario {
    protected readonly deployer: AdminClient;

    protected constructor(deployer: AdminClient) {
        this.deployer = deployer;
    }

    public async setup(): Promise<void> {
        await this.deployer.initializeSystemCommand();
    }
}
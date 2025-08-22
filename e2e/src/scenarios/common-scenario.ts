import { AdminClient } from "../core/admin-client";
import { Connection, PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { FillsRegistry } from "../core/account-defs";
import { getFillsRegistry } from "../core/utils/fills-registry";

export abstract class CommonScenario {
    protected readonly admin: AdminClient;

    protected constructor(admin: AdminClient) {
        this.admin = admin;
    }

    public async setup(admin: PublicKey = this.admin.session.getPublicKey(), denyAuthority?: PublicKey): Promise<void> {
        await this.admin.initializeSystemCommand();
        await this.admin.initMockProgramCommand();

        await this.admin.setAdminCommand(admin.toString());
        await this.admin.setDenyAuthorityCommand(denyAuthority?.toString() ?? admin.toString());
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

    public getAdmin(): AdminClient {
        return this.admin;
    }

    public async toggleSystemState(isHalted: boolean): Promise<void> {
        await this.admin.toggleSystemStateCommand(isHalted);
    }

    public async addUserToDenyList(user: PublicKey): Promise<void> {
        await this.admin.addUserToDenyListCommand(user.toString());
    }

    public async removeUserFromDenyList(user: PublicKey): Promise<void> {
        await this.admin.removeUserFromDenyListCommand(user.toString());
    }

    public async setFillsConsumer(consumer: PublicKey): Promise<void> {
        await this.admin.setFillsConsumerCommand(consumer.toString());
    }

    public async airdropToMockVault(amount: number): Promise<void> {
        await this.admin.airdropToMockVaultCommand(amount);
    }

    public async mockTokenMint(amount: number, toUser: PublicKey): Promise<void> {
        await this.admin.mockTokenMintCommand(amount, toUser);
    }

    public async getFillsRegistry(): Promise<FillsRegistry> {
        return await getFillsRegistry(this.admin.session.getProgram());
    }
}
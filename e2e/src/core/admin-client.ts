import { AdminSession } from "./admin-session";

export class AdminClient {
    public readonly session: AdminSession;

    private constructor(keyPairPath?: string, rpcUrl?: string) {
        this.session = new AdminSession(keyPairPath, rpcUrl);
    }

    public static async create(keyPairPath?: string, rpcUrl?: string): Promise<AdminClient> {
        const client = new AdminClient(keyPairPath, rpcUrl);
        await client.session.initialize();
        return client;
    }

    public async initializeSystemCommand(): Promise<void> {
        await this.session.executeCliCommand("init");
    }

    public async updateConfigsCommand(): Promise<void> {
        await this.session.executeCliCommand(`update-configs`);
    }

    public async viewConfigCommand(): Promise<string> {
        return await this.session.executeCliCommand(`view-config`);
    }

    public async withdrawTokensCommand(amount: number, destination: string): Promise<void> {
        await this.session.executeCliCommand(`withdraw-tokens -a ${amount} -t ${destination}`);
    }

    public async toggleSystemStateCommand(isHalted: boolean): Promise<void> {
        await this.session.executeCliCommand(`toggle-system-state --${isHalted ? "pause" : "activate"}`);
    }

    public async viewSystemStateCommand(): Promise<string> {
        return await this.session.executeCliCommand(`view-system-state`);
    }

    public async setAdminCommand(admin: string): Promise<void> {
        await this.session.executeCliCommand(`set-admin -a ${admin}`);
    }

    public async addUserToDenyListCommand(user: string): Promise<void> {
        await this.session.executeCliCommand(`add-to-deny-list -a ${user}`);
    }

    public async removeUserFromDenyListCommand(user: string): Promise<void> {
        await this.session.executeCliCommand(`remove-from-deny-list -a ${user}`);
    }

    public async viewDenyListCommand(): Promise<string> {
        return await this.session.executeCliCommand(`view-deny-list`);
    }

    public async addDequeuerCommand(dequeuer: string): Promise<void> {
        await this.session.executeCliCommand(`add-dequeuer -a ${dequeuer}`);
    }

    public async removeDequeuerCommand(dequeuer: string): Promise<void> {
        await this.session.executeCliCommand(`remove-dequeuer -a ${dequeuer}`);
    }

}
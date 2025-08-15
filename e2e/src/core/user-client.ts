import { UserSession } from "./user-session";

export class UserClient {
    public readonly session: UserSession;

    private constructor(keyPairPath?: string, rpcUrl?: string) {
        this.session = new UserSession(keyPairPath, rpcUrl);
    }

    public static async create(keyPairPath?: string, rpcUrl?: string): Promise<UserClient> {
        const client = new UserClient(keyPairPath, rpcUrl);
        await client.session.initialize();
        return client;
    }

    public async buySolCommand(amount: number): Promise<string> {
        return await this.session.executeCliCommand(`buy-sol --bid-price ${amount}`);
    }

    public async getPriceCommand(): Promise<string> {
        return await this.session.executeCliCommand(`get-price`);
    }

    public async getQuantityCommand(): Promise<string> {
        return await this.session.executeCliCommand(`get-quantity`);
    }
}
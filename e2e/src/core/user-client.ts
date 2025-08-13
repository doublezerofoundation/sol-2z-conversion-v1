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
}
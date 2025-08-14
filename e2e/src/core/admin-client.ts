import { PublicKey } from "@solana/web3.js";
import { AdminSession } from "./admin-session";
import { findOrInitializeAssociatedTokenAccount } from "./utils/account-helper";
import { getMockDoubleZeroTokenMintPDA } from "./utils/pda-helper";

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
        await this.session.executeCliCommand(`update-config`);
    }

    public async viewConfigCommand(): Promise<string> {
        return await this.session.executeCliCommand(`view-config`);
    }

    public async toggleSystemStateCommand(isHalted: boolean): Promise<string> {
        return await this.session.executeCliCommand(`toggle-system-state --${isHalted ? "pause" : "activate"}`);
    }

    public async viewSystemStateCommand(): Promise<string> {
        return await this.session.executeCliCommand(`view-system-state`);
    }

    public async setAdminCommand(admin: string): Promise<void> {
        await this.session.executeCliCommand(`set-admin -a ${admin}`);
    }

    public async setDenyAuthorityCommand(authority: string): Promise<void> {
        await this.session.executeCliCommand(`set-deny-authority -a ${authority}`);
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

    public async addDequeuerCommand(dequeuer: string): Promise<string> {
        return await this.session.executeCliCommand(`add-dequeuer -a ${dequeuer}`);
    }

    public async removeDequeuerCommand(dequeuer: string): Promise<string> {
        return await this.session.executeCliCommand(`remove-dequeuer -a ${dequeuer}`);
    }

    public async initMockProgramCommand(): Promise<void> {
        await this.session.executeCliCommand(`init-mock-program`);
    }

    public async airdropToMockVaultCommand(amount: number): Promise<void> {
        await this.session.executeCliCommand(`airdrop-to-mock-vault -a ${amount}`);
    }

    public async mockTokenMintCommand(amount: number, toUser: PublicKey): Promise<void> {
        const mockProgram = this.session.getMockProgram();
        const ata = await findOrInitializeAssociatedTokenAccount(
            this.session.getKeypair(),
            toUser,
            await getMockDoubleZeroTokenMintPDA(mockProgram.programId),
            mockProgram
        );
        await this.session.executeCliCommand(`mock-token-mint -a ${amount} -t ${ata}`);
    }

}
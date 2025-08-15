import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AdminClient } from "../core/admin-client";
import { TOKEN_DECIMALS } from "../core/constants";
import { UserClient } from "../core/user-client";
import { findOrInitializeAssociatedTokenAccount } from "../core/utils/account-helper";
import { getMockDoubleZeroTokenMintPDA, getMockProtocolTreasuryAccount, getMockVaultPDA } from "../core/utils/pda-helper";
import { CommonScenario } from "./common-scenario";
import { expect } from "chai";
import { getConfig } from "../core/utils/config-util";

export class BuySolScenario extends CommonScenario {
    private readonly user: UserClient;

    constructor(admin: AdminClient, user: UserClient) {
        super(admin);
        this.user = user;
    }

    public async buySolAndVerify(amount: number): Promise<string> {
        const initial2ZBalance = await this.checkAndReimburseUser2ZBalance(amount);
        const initialSolBalance = await this.getUserSolBalance();

        const result = await this.user.buySolCommand(amount);

        const final2ZBalance = await this.getUser2ZBalance();
        expect(final2ZBalance).to.be.lessThan(initial2ZBalance);

        const finalSolBalance = await this.getUserSolBalance();
        expect(finalSolBalance).to.be.greaterThan(initialSolBalance);

        return result;
    }

    public async buySolAndVerifyFail(amount: number, errorMessage: string): Promise<void> {
        try {
            await this.user.buySolCommand(amount);
            expect.fail("Buy Sol should fail");
        } catch (error) {
            this.handleExpectedError(error, errorMessage);
        }
    }

    public async checkAndReimburseUser2ZBalance(amount: number): Promise<number> {
        const ata = await findOrInitializeAssociatedTokenAccount(
            this.admin.session.getKeypair(),
            this.user.session.getPublicKey(),
            await getMockDoubleZeroTokenMintPDA(this.admin.session.getMockProgram().programId),
            this.admin.session.getMockProgram()
        );

        const balance = await this.admin.session.getMockProgram().provider.connection.getTokenAccountBalance(ata);
        let tokenAmount = balance.value.uiAmount ?? 0;
        const solQuantity = getConfig().sol_quantity / LAMPORTS_PER_SOL;
        const requiredAmount = amount * solQuantity;

        if (tokenAmount >= requiredAmount) {
            // Do nothing
        } else {
            await this.admin.mockTokenMintCommand(requiredAmount, this.user.session.getPublicKey());
            tokenAmount += requiredAmount;
        }

        return tokenAmount;
    }

    public async getUser2ZBalance(): Promise<number> {
        const ata = await findOrInitializeAssociatedTokenAccount(
            this.admin.session.getKeypair(),
            this.user.session.getPublicKey(),
            await getMockDoubleZeroTokenMintPDA(this.admin.session.getMockProgram().programId),
            this.admin.session.getMockProgram()
        );

        const balance = await this.admin.session.getMockProgram().provider.connection.getTokenAccountBalance(ata);
        return balance.value.uiAmount ?? 0;
    }

    public async getVault2ZBalance(): Promise<number> {
        const mockVaultPDA = await getMockProtocolTreasuryAccount(this.admin.session.getMockProgram().programId);
        const mockVaultBalance = await this.admin.session.getMockProgram().provider.connection.getTokenAccountBalance(mockVaultPDA);
        const balance = mockVaultBalance.value.uiAmount ?? 0;
        return balance / TOKEN_DECIMALS;
    }

    public async getUserSolBalance(): Promise<number> {
        const balance = await this.admin.session.getMockProgram().provider.connection.getBalance(this.user.session.getPublicKey());
        return balance / LAMPORTS_PER_SOL;
    }

    public async getVaultSolBalance(): Promise<number> {
        const mockVaultPDA = await getMockVaultPDA(this.admin.session.getMockProgram().programId);
        const mockVaultBalance = await this.admin.session.getMockProgram().provider.connection.getBalance(mockVaultPDA);
        return mockVaultBalance / LAMPORTS_PER_SOL;
    }

    public getUserPublicKey(): PublicKey {
        return this.user.session.getPublicKey();
    }
}
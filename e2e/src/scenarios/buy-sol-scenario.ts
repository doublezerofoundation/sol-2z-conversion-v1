import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AdminClient } from "../core/admin-client";
import { TOKEN_DECIMALS } from "../core/constants";
import { UserClient } from "../core/user-client";
import { findOrInitializeAssociatedTokenAccount } from "../core/utils/account-helper";
import { getMockDoubleZeroTokenMintPDA } from "../core/utils/pda-helper";
import { CommonScenario } from "./common-scenario";
import { expect } from "chai";

export class BuySolScenario extends CommonScenario {
    private readonly user: UserClient;

    constructor(admin: AdminClient, user: UserClient) {
        super(admin);
        this.user = user;
    }

    public async buySolAndVerify(amount: number): Promise<string> {
        const initial2ZBalance = await this.checkAndReimburseUser2ZBalance();
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
            await this.buySolAndVerify(amount);
            expect.fail("Buy Sol should fail");
        } catch (error) {
            expect(error!.toString()).to.contain(errorMessage);
        }
    }

    public async checkAndReimburseUser2ZBalance(): Promise<number> {
        const ata = await findOrInitializeAssociatedTokenAccount(
            this.admin.session.getKeypair(),
            this.user.session.getPublicKey(),
            await getMockDoubleZeroTokenMintPDA(this.admin.session.getMockProgram().programId),
            this.admin.session.getMockProgram()
        );

        const balance = await this.admin.session.getMockProgram().provider.connection.getTokenAccountBalance(ata);
        let tokenAmount = balance.value.uiAmount ?? 0;
        if (tokenAmount >= 500 * TOKEN_DECIMALS) {
            // Do nothing
        } else {
            await this.admin.mockTokenMintCommand(500, this.user.session.getPublicKey());
            tokenAmount += 500 * TOKEN_DECIMALS;
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

    public async getUserSolBalance(): Promise<number> {
        const balance = await this.admin.session.getMockProgram().provider.connection.getBalance(this.user.session.getPublicKey());
        return balance / LAMPORTS_PER_SOL;
    }

    public getUserPublicKey(): PublicKey {
        return this.user.session.getPublicKey();
    }
}
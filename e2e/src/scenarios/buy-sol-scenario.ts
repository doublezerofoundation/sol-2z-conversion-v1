import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AdminClient } from "../core/admin-client";
import { TOKEN_DECIMALS } from "../core/constants";
import { UserClient } from "../core/user-client";
import { findOrInitializeAssociatedTokenAccount, getConfigurationRegistryAccount } from "../core/utils/account-helper";
import { getMockDoubleZeroTokenMintPDA, getMockProgramPDAs, getMockProtocolTreasuryAccount, getMockVaultPDA } from "../core/utils/pda-helper";
import { CommonScenario } from "./common-scenario";
import { expect, assert } from "chai";
import { getConfig } from "../core/utils/config-util";
import { getFillsRegistry, getFillsRegistryAccountAddress } from "../core/utils/fills-registry";
import { OraclePriceData } from "../core/utils/price-oracle";
import { AnchorError, BN } from "@coral-xyz/anchor";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export class BuySolScenario extends CommonScenario {
    private readonly user: UserClient;

    constructor(admin: AdminClient, user: UserClient) {
        super(admin);
        this.user = user;
    }

    public async buySolAndVerify(amount: number): Promise<string> {
        // get initial values
        const initialUser2ZBalance = await this.checkAndReimburseUser2ZBalance(amount);
        const initialUserSolBalance = await this.getUserSolBalance();
        const initialVaultSolBalance = await this.checkAndReimburseVaultSolBalance();
        const initialVault2ZBalance = await this.getVault2ZBalance();

        const initialFillsRegistry = await getFillsRegistry(this.admin.session.getProgram());

        // buy sol
        const result = await this.user.buySolCommand(amount);

        // get final values
        const finalUser2ZBalance = await this.getUser2ZBalance();
        const finalUserSolBalance = await this.getUserSolBalance();
        const finalVaultSolBalance = await this.getVaultSolBalance();
        const finalVault2ZBalance = await this.getVault2ZBalance();

        const finalFillsRegistry = await getFillsRegistry(this.admin.session.getProgram());

        // compute expected values
        const { solQuantity } = await getConfigurationRegistryAccount(this.admin.session.getProgram());
        const tokenBalanceChange = amount * Number(solQuantity) / LAMPORTS_PER_SOL;
        const solBalanceChange = Number(solQuantity) / LAMPORTS_PER_SOL;
        const tolerance = 0.00001;

        // verify balances
        assert(Math.abs(finalUser2ZBalance - (initialUser2ZBalance - tokenBalanceChange)) < tolerance, "User 2Z balance is not correct");
        assert(Math.abs(finalUserSolBalance - (initialUserSolBalance + solBalanceChange)) < tolerance, "User SOL balance is not correct");
        assert(Math.abs(finalVaultSolBalance - (initialVaultSolBalance - solBalanceChange)) < tolerance, "Vault SOL balance is not correct");
        assert(Math.abs(finalVault2ZBalance - (initialVault2ZBalance + tokenBalanceChange)) < tolerance, "Vault 2Z balance is not correct");

        // verify fills registry
        // count should be incremented by 1
        assert(Number(finalFillsRegistry.count) === Number(initialFillsRegistry.count) + 1, "Fills registry count is not correct");

        // tail should be incremented by 1
        assert(Number(finalFillsRegistry.tail) === Number(initialFillsRegistry.tail) + 1, "Fills registry tail is not correct");

        // head should be the same
        assert(Number(finalFillsRegistry.head) === Number(initialFillsRegistry.head), "Fills registry head is not correct");

        // total sol pending should be incremented by the amount of sol bought
        assert(Number(finalFillsRegistry.totalSolPending) === Number(initialFillsRegistry.totalSolPending) + solBalanceChange * LAMPORTS_PER_SOL, "Fills registry total sol pending is not correct");

        // total 2Z pending should be incremented by the amount of 2Z bought
        const actualTokenBalanceChange = Number(finalVault2ZBalance) - Number(initialVault2ZBalance);
        assert(Math.abs(Number(finalFillsRegistry.total2ZPending) - Number(initialFillsRegistry.total2ZPending) - (actualTokenBalanceChange * TOKEN_DECIMALS)) < tolerance, "Fills registry total 2Z pending is not correct");

        // lifetime sol processed should be unchanged
        assert(Number(finalFillsRegistry.lifetimeSolProcessed) === Number(initialFillsRegistry.lifetimeSolProcessed), "Fills registry lifetime sol processed is not correct");
        // lifetime 2Z processed should be unchanged
        assert(Number(finalFillsRegistry.lifetime2ZProcessed) === Number(initialFillsRegistry.lifetime2ZProcessed), "Fills registry lifetime 2Z processed is not correct");

        // new fill should be added at the tail
        const newFill = finalFillsRegistry.fills[Number(finalFillsRegistry.tail) - 1];        
        assert(Number(newFill.solIn) === solBalanceChange * LAMPORTS_PER_SOL, "Fills registry new fill sol in is not correct");
        assert(Math.abs(Number(newFill.token2ZOut) - actualTokenBalanceChange * TOKEN_DECIMALS) < tolerance, "Fills registry new fill token 2Z out is not correct");

        return result;
    }

    public async buySolAndVerifyFail(amount: number, errorMessage: string): Promise<string> {
        try {
            await this.user.buySolCommand(amount);
            expect.fail("Buy Sol should fail");
        } catch (error) {
            this.handleExpectedError(error, errorMessage);
            return error!.toString();
        }
    }

    public async buySolAndVerifyFailWithAttestation(amount: number, oraclePriceData: OraclePriceData, errorMessage: string): Promise<AnchorError> {
        // get required PDAs
        const fillsRegistryAddress = await getFillsRegistryAccountAddress(this.admin.session.getProgram());
        const senderTokenAccount = await findOrInitializeAssociatedTokenAccount(
            this.admin.session.getKeypair(),
            this.user.session.getPublicKey(),
            await getMockDoubleZeroTokenMintPDA(this.admin.session.getMockProgram().programId),
            this.admin.session.getMockProgram()
        );
        const mockProgramPDAs = await getMockProgramPDAs(this.admin.session.getMockProgram().programId);

        // manually call the buy sol command with the attestation
        const buySolTx = this.user.session.getProgram().methods.buySol(
            new BN(amount),
            {
                swapRate: new BN(oraclePriceData.swapRate),
                timestamp: new BN(oraclePriceData.timestamp),
                signature: oraclePriceData.signature,
            }
        )
        .accounts({
            fillsRegistry: fillsRegistryAddress,
            userTokenAccount: senderTokenAccount,
            vaultAccount: mockProgramPDAs.vault,
            protocolTreasuryTokenAccount: mockProgramPDAs.protocolTreasury,
            doubleZeroMint: mockProgramPDAs.tokenMint,
            configAccount: mockProgramPDAs.config,
            revenueDistributionJournal: mockProgramPDAs.journal,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            revenueDistributionProgram: this.user.session.getMockProgram().programId,
            signer: this.user.session.getPublicKey()
        })
        .signers([this.user.session.getKeypair()]);;

        try {
            await buySolTx.rpc();
        } catch (error) {
            this.handleExpectedError(error, errorMessage);
            return error as AnchorError;
        }
        assert.fail("Buy Sol should fail");
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

    public async checkAndReimburseVaultSolBalance(): Promise<number> {
        const vaultSolBalance = await this.getVaultSolBalance();
        const requiredAmount = getConfig().sol_quantity / LAMPORTS_PER_SOL;

        if (vaultSolBalance >= requiredAmount) {
            return vaultSolBalance;
        }

        await this.airdropToMockVault(requiredAmount);
        return vaultSolBalance + requiredAmount;
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
        return balance;
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
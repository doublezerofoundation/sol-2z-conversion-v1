import {
    getMockConfig,
    getMockDoubleZeroTokenMintPDA, getMockProtocolTreasuryAccount,
    getMockRevenueDistributionJournal, getMockVaultPDA,
} from "../utils/pda-helper";
import {assert} from "chai";
import {Keypair, PublicKey} from "@solana/web3.js";
import {accountExists, getDefaultKeyPair} from "../utils/accounts";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import {getTokenBalance} from "../utils/token-utils";
import {Program} from "@coral-xyz/anchor";
import {MockTransferProgram} from "../../../../mock-double-zero-program/target/types/mock_transfer_program";

export async function initializeMockTransferSystemAndVerify(
    program: Program<MockTransferProgram>,
    adminKeyPair: Keypair = getDefaultKeyPair(),
) {
    // List of accounts to be verified.
    const pdas = [
        getMockVaultPDA(program.programId),
        getMockDoubleZeroTokenMintPDA(program.programId),
        getMockProtocolTreasuryAccount(program.programId),
        getMockConfig(program.programId),
        getMockRevenueDistributionJournal(program.programId),
    ];

    // Accounts to be initialized should not exist before initialization.
    let [mockVaultExists, mockTokenMintExists, mockProtocolTreasuryAccountExists, mockConfigExists, mockRevenueDistributionJournalExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isFalse(mockVaultExists, "Mock Vault Account should not exist before initialization");
    assert.isFalse(mockTokenMintExists, "Mock Token Mint should not exist before initialization");
    assert.isFalse(mockProtocolTreasuryAccountExists, "Mock Protocol Treasury Account should not exist before initialization");
    assert.isFalse(mockConfigExists, "Mock Config Account should not exist before initialization");
    assert.isFalse(mockRevenueDistributionJournalExists, "Mock Revenue Distribution Journal Account should not exist before initialization");

    // Initialization.
    try {
        await program.methods.initialize()
            .accounts({
                tokenProgram: TOKEN_2022_PROGRAM_ID
            })
            .signers([adminKeyPair])
            .rpc();
    } catch (e) {
        console.error("System initialization failed:", e);
        assert.fail("System initialization failed");
    }


    // Verify Existence of Initialized Accounts
    [mockVaultExists, mockTokenMintExists, mockProtocolTreasuryAccountExists, mockConfigExists, mockRevenueDistributionJournalExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isTrue(mockVaultExists, "Mock Vault Account should exist after initialization");
    assert.isTrue(mockTokenMintExists, "Mock Token Mint should exist after initialization");
    assert.isTrue(mockProtocolTreasuryAccountExists, "Mock Protocol Treasury Account should exist after initialization");
    assert.isTrue(mockConfigExists, "Mock Protocol Treasury Account should exist after initialization");
    assert.isTrue(mockRevenueDistributionJournalExists, "Revenue Distribution Journal should exist after initialization");
}

export async function initializeMockTransferSystemIfNeeded(
    program: Program<MockTransferProgram>,
    adminKeyPair: Keypair = getDefaultKeyPair(),
) {
    if(!await accountExists(program.provider.connection, getMockProtocolTreasuryAccount(program.programId))) {
        await initializeMockTransferSystemAndVerify(
            program,
            adminKeyPair,
        )
    }
}

export async function mint2z(
    program,
    recipientTokenAccount: PublicKey,
    amount: number
) {
    amount = Math.ceil(amount);
    const balanceBeforeMint = await getTokenBalance(program.provider.connection, recipientTokenAccount);
    try {
        await program.methods.mint2Z(new anchor.BN(amount))
            .accounts({
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                userTokenAccount: recipientTokenAccount
            })
            .rpc();
    } catch (e) {
        console.error("Token Mint  failed:", e);
        assert.fail("Token Mint  failed");
    }
    const balanceAfterMint = await getTokenBalance(program.provider.connection, recipientTokenAccount);

    assert.equal(
        balanceAfterMint,
        Math.floor(balanceBeforeMint + amount),
        "Balance should increase by mint"
    );
}
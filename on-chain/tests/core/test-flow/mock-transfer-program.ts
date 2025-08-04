import {
    getMockDoubleZeroTokenMintPDA, getMockProtocolTreasuryAccount, getMockVaultPDA,
} from "../utils/pda-helper";
import {assert} from "chai";
import {Keypair, PublicKey} from "@solana/web3.js";
import {accountExists, getDefaultKeyPair} from "../utils/account-utils";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import {TOKEN_DECIMAL} from "../constants";
import {getTokenBalance} from "../utils/token-utils";

export async function initializeMockTransferSystemAndVerify(
    program,
    adminKeyPair: Keypair = getDefaultKeyPair(),
) {
    // List of Accounts to be verified
    const pdas = [
        getMockVaultPDA(program.programId),
        getMockDoubleZeroTokenMintPDA(program.programId),
        getMockProtocolTreasuryAccount(program.programId),
    ];

    // Accounts to be initialized should not exist before initialization
    let [mockVaultExists, mockTokenMintExists, mockProtocolTreasuryAccountExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isFalse(mockVaultExists, "Mock Vault Account should not exist before initialization");
    assert.isFalse(mockTokenMintExists, "Mock Token Mint should not exist before initialization");
    assert.isFalse(mockProtocolTreasuryAccountExists, "Mock Protocol Treasury Account should not exist before initialization");

    // Initialization
    try {
        const tx = await program.methods.initialize()
            .accounts({
                tokenProgram: TOKEN_2022_PROGRAM_ID
            })
            .signers([adminKeyPair])
            .rpc();
        console.log("System Initialization is successful. Transaction Hash", tx);
    } catch (e) {
        console.error("System initialization failed:", e);
        assert.fail("System initialization failed");
    }


    // Verify Existence of Initialized Accounts
    [mockVaultExists, mockTokenMintExists, mockProtocolTreasuryAccountExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isTrue(mockVaultExists, "Mock Vault Account should exist after initialization");
    assert.isTrue(mockTokenMintExists, "Mock Token Mint should exist after initialization");
    assert.isTrue(mockProtocolTreasuryAccountExists, "Mock Protocol Treasury Account should exist after initialization");
}

export async function mint2z(
    program,
    recipientTokenAccount: PublicKey,
    amount: number
) {
    const balanceBeforeMint = await getTokenBalance(program.provider.connection, recipientTokenAccount);
    try {
        const tx = await program.methods.mint2Z(new anchor.BN(amount * TOKEN_DECIMAL))
            .accounts({
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                userTokenAccount: recipientTokenAccount
            })
            .rpc();
        console.log("Token Mint is successful. Transaction Hash", tx);
    } catch (e) {
        console.error("Token Mint  failed:", e);
        assert.fail("Token Mint  failed");
    }
    const balanceAfterMint = await getTokenBalance(program.provider.connection, recipientTokenAccount);

    assert.equal(balanceAfterMint, balanceBeforeMint + amount, "Balance should increase by mint")
}
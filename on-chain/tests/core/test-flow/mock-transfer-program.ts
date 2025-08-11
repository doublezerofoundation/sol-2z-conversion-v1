import {
    getMockDoubleZeroTokenMintPDA, getMockProgramPDAs, getMockProtocolTreasuryAccount, getMockVaultPDA,
} from "../utils/pda-helper";
import {assert} from "chai";
import {Keypair, PublicKey} from "@solana/web3.js";
import {accountExists, getDefaultKeyPair} from "../utils/accounts";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
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

export async function initializeMockTransferSystemIfNeeded(
    program,
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
    const balanceBeforeMint = await getTokenBalance(program.provider.connection, recipientTokenAccount);
    try {
        const tx = await program.methods.mint2Z(new anchor.BN(amount))
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

    assert.equal(
        balanceAfterMint,
        Math.floor(balanceBeforeMint + amount),
        "Balance should increase by mint"
    );
}
export async function buySol(
    program,
    senderTokenAccount: PublicKey,
    amount2Z: number,
    amountSol: number,
    signer: Keypair
) {
    const pdas = getMockProgramPDAs(program.programId);
    const tokenBalanceBefore = await getTokenBalance(program.provider.connection, senderTokenAccount);
    const protocolTreasuryBalanceBefore =
        await getTokenBalance(program.provider.connection, pdas.protocolTreasury);
    const solBalanceBefore = await program.provider.connection.getBalance(signer.publicKey);
    const vaultBalanceBefore = await program.provider.connection.getBalance(pdas.vault);

    try {
        const tx = await program.methods.buySol(
            new anchor.BN(amount2Z),
            new anchor.BN(amountSol)
        )
            .accounts({
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                userTokenAccount: senderTokenAccount,
                signer: signer.publicKey
            })
            .signers([signer])
            .rpc();
        console.log("Buy Sol is successful. Transaction Hash", tx);
    } catch (e) {
        console.error("Buy Sol  failed:", e);
        assert.fail("Buy Sol  failed");
    }

    const tokenBalanceAfter = await getTokenBalance(program.provider.connection, senderTokenAccount);
    const solBalanceAfter = await program.provider.connection.getBalance(signer.publicKey);
    const protocolTreasuryBalanceAfter =
        await getTokenBalance(program.provider.connection, pdas.protocolTreasury);
    const vaultBalanceAfter = await program.provider.connection.getBalance(pdas.vault);

    assert.equal(
        tokenBalanceAfter,
        tokenBalanceBefore - amount2Z,
        "Token Balance should decrease by amount_2z"
    )
    assert.equal(
        protocolTreasuryBalanceAfter,
        protocolTreasuryBalanceBefore + amount2Z,
        "Token Balance should increase by amount_2z"
    )
    assert.equal(
        solBalanceAfter,
        solBalanceBefore + amountSol,
        "SOL Balance should increase by amount_sol"
    )
    assert.equal(
        vaultBalanceAfter,
        vaultBalanceBefore - amountSol,
        "Vault SOL Balance should decrease by amount_sol"
    )
}

export async function withdraw_2z(
    program,
    recipientTokenAccount: PublicKey,
    amount2z: number,
    signer: Keypair
) {
    const pdas = getMockProgramPDAs(program.programId);
    const tokenBalanceBefore = await getTokenBalance(program.provider.connection, recipientTokenAccount);
    const protocolTreasuryBalanceBefore =
        await getTokenBalance(program.provider.connection, pdas.protocolTreasury);

    try {
        const tx = await program.methods.withdraw2Z(
            new anchor.BN(amount2z)
        )
            .accounts({
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                recipientTokenAccount: recipientTokenAccount,
                signer: signer.publicKey
            })
            .signers([signer])
            .rpc();
        console.log("Withdraw 2Z is successful. Transaction Hash", tx);
    } catch (e) {
        console.error("Withdraw 2Z failed:", e);
        assert.fail("Withdraw 2Z failed");
    }

    const tokenBalanceAfter = await getTokenBalance(program.provider.connection, recipientTokenAccount);
    const protocolTreasuryBalanceAfter =
        await getTokenBalance(program.provider.connection, pdas.protocolTreasury);

    assert.equal(
        tokenBalanceAfter,
        tokenBalanceBefore + amount2z,
        "Token Balance of User should decrease by amount_2z"
    )
    assert.equal(
        protocolTreasuryBalanceAfter,
        protocolTreasuryBalanceBefore - amount2z,
        "Token Balance of Protocol Treasury should increase by amount_2z"
    )
}
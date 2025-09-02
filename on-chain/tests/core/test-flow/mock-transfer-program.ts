import {
    getMockConfig,
    getMockDoubleZeroTokenMintPDA,
    getMockProtocolTreasuryAccount,
    getMockRevenueDistributionJournal,
} from "../utils/pda-helper";
import {assert} from "chai";
import {Keypair, PublicKey, Transaction, TransactionInstruction} from "@solana/web3.js";
import {accountExists, getDefaultKeyPair} from "../utils/accounts";
import {TOKEN_2022_PROGRAM_ID} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {getTokenBalance} from "../utils/token-utils";
import {ConverterProgram} from "../../../target/types/converter_program";
import {MOCK_TRANSFER_PROGRAM, MockProgramInstructions} from "../constants";
import { sha256 } from "js-sha256";
import MOCK_SYSTEM_INITIALIZE = MockProgramInstructions.MOCK_SYSTEM_INITIALIZE;
import MOCK_TOKEN_MINT_INSTRUCTION = MockProgramInstructions.MOCK_TOKEN_MINT_INSTRUCTION; // For computing 8-byte discriminator

export async function initializeMockTransferSystemAndVerify(
    program: Program<ConverterProgram>,
    adminKeyPair: Keypair = getDefaultKeyPair(),
) {
    // List of accounts to be verified.
    const pdas = [
        getMockDoubleZeroTokenMintPDA(),
        getMockProtocolTreasuryAccount(),
        getMockConfig(),
        getMockRevenueDistributionJournal(),
    ];

    // Accounts to be initialized should not exist before initialization.
    let [mockTokenMintExists, mockProtocolTreasuryAccountExists, mockConfigExists, mockRevenueDistributionJournalExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isFalse(mockTokenMintExists, "Mock Token Mint should not exist before initialization");
    assert.isFalse(mockProtocolTreasuryAccountExists, "Mock Protocol Treasury Account should not exist before initialization");
    assert.isFalse(mockConfigExists, "Mock Config Account should not exist before initialization");
    assert.isFalse(mockRevenueDistributionJournalExists, "Mock Revenue Distribution Journal Account should not exist before initialization");

    // Initialization.
    // Compute 8-byte discriminator for `dz::ix::initialize`
    const fullHash = new Uint8Array(sha256.array(MOCK_SYSTEM_INITIALIZE));
    const data = Buffer.from(fullHash.subarray(0, 8));
    try {
        const ix = new TransactionInstruction({
            programId: MOCK_TRANSFER_PROGRAM,
            keys: [
                {pubkey: pdas[2], isSigner: false, isWritable: true},
                {pubkey: pdas[3], isSigner: false, isWritable: true},
                {pubkey: pdas[0], isSigner: false, isWritable: true},
                {pubkey: pdas[1], isSigner: false, isWritable: true},
                {pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false},
                {pubkey: anchor.web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
                {pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false},
                {pubkey: adminKeyPair.publicKey, isSigner: true, isWritable: true},
            ],
            data,
        })
        const tx: Transaction = new anchor.web3.Transaction().add(ix);
        const txSig = await program.provider.sendAndConfirm(tx, [adminKeyPair]);
        console.log("Transaction signature:", txSig);
    } catch (e) {
        console.error("System initialization failed:", e);
        assert.fail("System initialization failed");
    }

    // Verify Existence of Initialized Accounts
    [mockTokenMintExists, mockProtocolTreasuryAccountExists, mockConfigExists, mockRevenueDistributionJournalExists] = await Promise.all(
        pdas.map((pda) => accountExists(program.provider.connection, pda))
    );

    assert.isTrue(mockTokenMintExists, "Mock Token Mint should exist after initialization");
    assert.isTrue(mockProtocolTreasuryAccountExists, "Mock Protocol Treasury Account should exist after initialization");
    assert.isTrue(mockConfigExists, "Mock Protocol Treasury Account should exist after initialization");
    assert.isTrue(mockRevenueDistributionJournalExists, "Revenue Distribution Journal should exist after initialization");
}

export async function initializeMockTransferSystemIfNeeded(
    program: Program<ConverterProgram>,
    adminKeyPair: Keypair = getDefaultKeyPair(),
) {
    if(!await accountExists(program.provider.connection, getMockProtocolTreasuryAccount())) {
        await initializeMockTransferSystemAndVerify(
            program,
            adminKeyPair,
        )
    }
}

export async function mint2z(
    program: Program<ConverterProgram>,
    recipientTokenAccount: PublicKey,
    amount: number
) {
    amount = Math.ceil(amount);
    const balanceBeforeMint = await getTokenBalance(program.provider.connection, recipientTokenAccount);
    const fullHash = new Uint8Array(sha256.array(MOCK_TOKEN_MINT_INSTRUCTION));
    const discriminator = fullHash.subarray(0, 8);

    const amountBytes = new anchor.BN(amount).toArray("le", 8);
    const data = Buffer.concat([Buffer.from(discriminator), Buffer.from(amountBytes)]);
    try {
        const ix = new TransactionInstruction({
            programId: MOCK_TRANSFER_PROGRAM,
            keys: [
                {pubkey: recipientTokenAccount, isSigner: false, isWritable: true},
                {pubkey: getMockDoubleZeroTokenMintPDA(), isSigner: false, isWritable: true},
                {pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false},
            ],
            data,
        })
        const tx: Transaction = new anchor.web3.Transaction().add(ix);
        const txSig = await program.provider.sendAndConfirm(tx);
        console.log("Transaction signature:", txSig);
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
import {getMockConfig, getMockProgramPDAs, getMockRevenueDistributionJournal} from "../utils/pda-helper";
import {assert, expect} from "chai";
import {Keypair, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {BN, Program} from "@coral-xyz/anchor";
import { ConverterProgram } from "../../../target/types/converter_program";
import {getTokenBalance} from "../utils/token-utils";
import * as anchor from "@coral-xyz/anchor";
import {TOKEN_2022_PROGRAM_ID} from "@solana/spl-token";
import {MockTransferProgram} from "../../../../mock-double-zero-program/target/types/mock_transfer_program";
import {getOraclePriceData, OraclePriceData} from "../utils/price-oracle";
import {DEFAULT_CONFIGS} from "../utils/configuration-registry";
import {Fill, FillsRegistry, getFillsRegistryAccount, getFillsRegistryAccountAddress} from "../utils/fills-registry";
import {getConversionPriceAndVerify} from "./conversion-price";
import {TOKEN_DECIMAL} from "../constants";
import {mint2z} from "./mock-transfer-program";
import {airdropVault} from "../utils/mock-transfer-program-utils";

export async function buySolAndVerify(
    program: Program<ConverterProgram>,
    mockTransferProgram: Program<MockTransferProgram>,
    senderTokenAccount: PublicKey,
    bidPrice: number,
    signer: Keypair,
    oraclePriceData: OraclePriceData,
    currentConfigs = DEFAULT_CONFIGS,
) {
    const pdas = getMockProgramPDAs(mockTransferProgram.programId);
    const tokenBalanceBefore = await getTokenBalance(mockTransferProgram.provider.connection, senderTokenAccount);
    const protocolTreasuryBalanceBefore = await getTokenBalance(mockTransferProgram.provider.connection, pdas.protocolTreasury);
    const solBalanceBefore = await program.provider.connection.getBalance(signer.publicKey);
    const vaultBalanceBefore = await program.provider.connection.getBalance(pdas.vault);
    const fillsRegistryAddress: PublicKey = await getFillsRegistryAccountAddress(program);
    const mockConfigAccount: PublicKey = getMockConfig(mockTransferProgram.programId);
    const mockRevenueDistributionJournal: PublicKey = getMockRevenueDistributionJournal(mockTransferProgram.programId);

    const fillsRegistryBefore: FillsRegistry = await getFillsRegistryAccount(program);

    try {
        await program.methods.buySol(
            new anchor.BN(bidPrice),
            {
                swapRate: new BN(oraclePriceData.swapRate),
                timestamp: new BN(oraclePriceData.timestamp),
                signature: oraclePriceData.signature,
            }
        )
            .accounts({
                fillsRegistry: fillsRegistryAddress,
                userTokenAccount: senderTokenAccount,
                vaultAccount: pdas.vault,
                protocolTreasuryTokenAccount: pdas.protocolTreasury,
                doubleZeroMint: pdas.tokenMint,
                configAccount: mockConfigAccount,
                revenueDistributionJournal: mockRevenueDistributionJournal,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                revenueDistributionProgram: mockTransferProgram.programId,
                signer: signer.publicKey
            })
            .signers([signer])
            .rpc();
        // console.log("Buy Sol is successful. Transaction Hash", tx);
    } catch (e) {
        console.error("Buy Sol  failed:", e);
        assert.fail("Buy Sol  failed");
    }

    const tokenBalanceChange = Number(currentConfigs.solQuantity) * bidPrice / LAMPORTS_PER_SOL;
    const solBalanceChange = Number(currentConfigs.solQuantity);
    const tokenBalanceAfter = await getTokenBalance(program.provider.connection, senderTokenAccount);
    const solBalanceAfter = await program.provider.connection.getBalance(signer.publicKey);
    const protocolTreasuryBalanceAfter =
        await getTokenBalance(program.provider.connection, pdas.protocolTreasury);
    const vaultBalanceAfter = await program.provider.connection.getBalance(pdas.vault);

    assert.equal(
        tokenBalanceAfter,
        tokenBalanceBefore - tokenBalanceChange,
        "Token Balance should decrease by tokenBalanceChange"
    )
    assert.equal(
        protocolTreasuryBalanceAfter,
        protocolTreasuryBalanceBefore + tokenBalanceChange,
        "Token Balance should increase by tokenBalanceChange"
    )
    assert.equal(
        solBalanceAfter,
        solBalanceBefore + solBalanceChange,
        "SOL Balance should increase by solBalanceChange"
    )
    assert.equal(
        vaultBalanceAfter,
        vaultBalanceBefore - solBalanceChange,
        "Vault SOL Balance should decrease by solBalanceChange"
    )

    // Check Fills Registry Values
    const fillsRegistryAfter: FillsRegistry = await getFillsRegistryAccount(program);
    assert.equal(fillsRegistryAfter.count, fillsRegistryBefore.count + 1);
    const fillEntry: Fill = fillsRegistryAfter.fills.slice(-1)[0];
    assert.equal(fillEntry.solIn, solBalanceChange);
    assert.equal(fillEntry.token2ZOut, tokenBalanceChange);
}

export async function buySolFail(
    program: Program<ConverterProgram>,
    mockTransferProgram: Program<MockTransferProgram>,
    senderTokenAccount: PublicKey,
    bidPrice: number,
    signer: Keypair,
    oraclePriceData: OraclePriceData,
    expectedError: string,
) {
    const pdas = getMockProgramPDAs(mockTransferProgram.programId);
    const fillsRegistryAddress: PublicKey = await getFillsRegistryAccountAddress(program);
    const mockConfigAccount: PublicKey = getMockConfig(mockTransferProgram.programId);
    const mockRevenueDistributionJournal: PublicKey = getMockRevenueDistributionJournal(mockTransferProgram.programId);

    try {
        await program.methods.buySol(
            new anchor.BN(bidPrice),
            {
                swapRate: new BN(oraclePriceData.swapRate),
                timestamp: new BN(oraclePriceData.timestamp),
                signature: oraclePriceData.signature,
            }
        )
            .accounts({
                fillsRegistry: fillsRegistryAddress,
                userTokenAccount: senderTokenAccount,
                vaultAccount: pdas.vault,
                protocolTreasuryTokenAccount: pdas.protocolTreasury,
                doubleZeroMint: pdas.tokenMint,
                configAccount: mockConfigAccount,
                revenueDistributionJournal: mockRevenueDistributionJournal,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                revenueDistributionProgram: mockTransferProgram.programId,
                signer: signer.publicKey
            })
            .signers([signer])
            .rpc();
    } catch (error) {
        // console.log("Buy SOL is rejected as expected");
        expect((new Error(error!.toString())).message).to.include(expectedError);
        assert.ok(true, "Buy SOL is rejected as expected");
        return; // Exit early — test passes
    }
    assert.fail("It was able to do buy SOL");
}

export async function buySolSuccess(
    program: Program<ConverterProgram>,
    mockTransferProgram: Program<MockTransferProgram>,
    senderTokenAccount: PublicKey,
    signer: Keypair,
    currentConfigs = DEFAULT_CONFIGS,
    bidFactor: number = 1,
): Promise<number> {
    const oraclePriceData = await getOraclePriceData();
    const askPrice = await getConversionPriceAndVerify(program, oraclePriceData);
    const bidPrice = Math.floor(askPrice * bidFactor);

    // Ensure that user has sufficient 2Z
    await mint2z(
        mockTransferProgram,
        senderTokenAccount,
        bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
    );
    // Ensure vault has funds.
    await airdropVault(mockTransferProgram, currentConfigs.solQuantity)
    await buySolAndVerify(program, mockTransferProgram, senderTokenAccount, bidPrice, signer, oraclePriceData, currentConfigs);
    return askPrice;
}
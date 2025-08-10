import {getFillsRegistryPDA, getMockProgramPDAs} from "../utils/pda-helper";
import {assert, expect} from "chai";
import {Keypair, PublicKey} from "@solana/web3.js";
import {BN, Program} from "@coral-xyz/anchor";
import { ConverterProgram } from "../../../target/types/converter_program";
import {getTokenBalance} from "../utils/token-utils";
import * as anchor from "@coral-xyz/anchor";
import {TOKEN_2022_PROGRAM_ID} from "@solana/spl-token";
import {MockTransferProgram} from "../../../target/types/mock_transfer_program";
import {getOraclePriceData, OraclePriceData} from "../utils/price-oracle";
import {DEFAULT_CONFIGS} from "../utils/configuration-registry";
import {getConversionPriceAndVerify} from "./conversion-price";

export async function buySolAndVerify(
    program: Program<ConverterProgram>,
    mockTransferProgram: Program<MockTransferProgram>,
    senderTokenAccount: PublicKey,
    bidPrice: number,
    signer: Keypair,
    oraclePriceData: OraclePriceData
) {
    const pdas = getMockProgramPDAs(mockTransferProgram.programId);
    const tokenBalanceBefore = await getTokenBalance(mockTransferProgram.provider.connection, senderTokenAccount);
    const protocolTreasuryBalanceBefore = await getTokenBalance(mockTransferProgram.provider.connection, pdas.protocolTreasury);
    const solBalanceBefore = await program.provider.connection.getBalance(signer.publicKey);
    const vaultBalanceBefore = await program.provider.connection.getBalance(pdas.vault);

    try {
        const tx = await program.methods.buySol(
            new anchor.BN(bidPrice),
            {
                swapRate: new BN(oraclePriceData.swapRate),
                timestamp: new BN(oraclePriceData.timestamp),
                signature: oraclePriceData.signature,
            }
        )
            .accounts({
                userTokenAccount: senderTokenAccount,
                vaultAccount: pdas.vault,
                protocolTreasuryTokenAccount: pdas.protocolTreasury,
                doubleZeroMint: pdas.tokenMint,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                revenueDistributionProgram: mockTransferProgram.programId,
                signer: signer.publicKey
            })
            .signers([signer])
            .rpc();
        console.log("Buy Sol is successful. Transaction Hash", tx);
    } catch (e) {
        console.error("Buy Sol  failed:", e);
        assert.fail("Buy Sol  failed");
    }

    const tokenBalanceChange = Number(DEFAULT_CONFIGS.solQuantity) * bidPrice;
    const solBalanceChange = Number(DEFAULT_CONFIGS.solQuantity);
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
                userTokenAccount: senderTokenAccount,
                vaultAccount: pdas.vault,
                protocolTreasuryTokenAccount: pdas.protocolTreasury,
                doubleZeroMint: pdas.tokenMint,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                revenueDistributionProgram: mockTransferProgram.programId,
                signer: signer.publicKey
            })
            .signers([signer])
            .rpc();
    } catch (error) {
        console.log("Buy SOL is rejected as expected");
        console.log(error);
        expect((new Error(error!.toString())).message).to.include(expectedError);
        assert.ok(true, "Buy SOL is rejected as expected");
        return; // Exit early — test passes
    }
    assert.fail("It was able to do buy SOL");

}
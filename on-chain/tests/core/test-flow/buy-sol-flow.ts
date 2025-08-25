import {getMockProgramPDAs} from "../utils/pda-helper";
import {assert, expect} from "chai";
import {Keypair, LAMPORTS_PER_SOL, PublicKey, TransactionInstruction, Transaction} from "@solana/web3.js";
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
import {mint2z} from "./mock-transfer-program";
import {airdropVault} from "../utils/mock-transfer-program-utils";
import {fetchProgramState} from "../utils/accounts";
import {findAnchorEventInLogs, getTransactionLogs} from "../utils/return-data";
import {Events} from "../constants";

export async function buySolAndVerify(
    program: Program<ConverterProgram>,
    mockTransferProgram: Program<MockTransferProgram>,
    senderTokenAccount: PublicKey,
    bidPrice: number,
    signer: Keypair,
    oraclePriceData: OraclePriceData,
    currentConfigs = DEFAULT_CONFIGS,
) {
    const mockProgConn = mockTransferProgram.provider.connection;
    const pdaList = getMockProgramPDAs(mockTransferProgram.programId);
    const tokenBalanceBefore = await getTokenBalance(mockProgConn, senderTokenAccount);
    const protocolTreasuryBalanceBefore = await getTokenBalance(mockProgConn, pdaList.protocolTreasury);
    const solBalanceBefore = await mockProgConn.getBalance(signer.publicKey);
    const vaultBalanceBefore = await mockProgConn.getBalance(pdaList.vault);
    const fillsRegistryBefore: FillsRegistry = await getFillsRegistryAccount(program);
    const lastTradedSlotBefore = (await fetchProgramState(program)).lastTradeSlot.toNumber();
    let txSig: string;

    try {
        const ix: TransactionInstruction = await prepareBuySolInstruction(
            program,
            mockTransferProgram,
            senderTokenAccount,
            bidPrice,
            signer,
            oraclePriceData
        )
        const tx: Transaction = new anchor.web3.Transaction().add(ix);
        txSig = await program.provider.sendAndConfirm(tx, [signer]);
    } catch (e) {
        console.error("Buy Sol  failed:", e);
        assert.fail("Buy Sol  failed");
    }

    const tokenBalanceChange = Number(currentConfigs.solQuantity) * bidPrice / LAMPORTS_PER_SOL;
    const solBalanceChange = Number(currentConfigs.solQuantity);

    const tokenBalanceAfter = await getTokenBalance(program.provider.connection, senderTokenAccount);
    const solBalanceAfter = await program.provider.connection.getBalance(signer.publicKey);
    const protocolTreasuryBalanceAfter =
        await getTokenBalance(program.provider.connection, pdaList.protocolTreasury);
    const vaultBalanceAfter = await program.provider.connection.getBalance(pdaList.vault);
    const lastTradedSlotAfter = (await fetchProgramState(program)).lastTradeSlot.toNumber();

    // assert whether event has been emitted or not
    const logs = await getTransactionLogs(program.provider, txSig);
    const event = await findAnchorEventInLogs(logs, program.idl, Events.TRADE);
    expect(event, "Trade event should be emitted").to.exist;

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
        "User's SOL Balance should increase by solBalanceChange"
    )
    assert.equal(
        vaultBalanceAfter,
        vaultBalanceBefore - solBalanceChange,
        "Vault SOL Balance should decrease by solBalanceChange"
    )

    // check last traded slot.
    assert.isTrue(lastTradedSlotAfter > lastTradedSlotBefore, "last-traded-slot has to be updated")

    // Check Fills Registry Values.
    const fillsRegistryAfter: FillsRegistry = await getFillsRegistryAccount(program);
    assert.equal(fillsRegistryAfter.count, fillsRegistryBefore.count + 1);
    assert.equal(fillsRegistryAfter.tail, (fillsRegistryBefore.tail + 1) % fillsRegistryBefore.maxCapacity);
    // Ensure added fill entry values are correct.
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
    expectedEvent: string = ""
) {
    try {
        const ix: TransactionInstruction = await prepareBuySolInstruction(
            program,
            mockTransferProgram,
            senderTokenAccount,
            bidPrice,
            signer,
            oraclePriceData
        )
        const tx: Transaction = new anchor.web3.Transaction().add(ix);
        await program.provider.sendAndConfirm(tx, [signer]);
    } catch (error) {
        expect((new Error(error!.toString())).message).to.include(expectedError);
        if(expectedEvent !== "") {
            const event = findAnchorEventInLogs(error.logs, program.idl, expectedEvent);
            expect(event, "Appropriate event should be emitted").to.exist;
        }
        assert.ok(true, "Buy SOL is rejected as expected");
        return; // Exit early — test passes.
    }
    assert.fail("It was able to do buy SOL");
}

export async function prepareBuySolInstruction(
    program: Program<ConverterProgram>,
    mockTransferProgram: Program<MockTransferProgram>,
    senderTokenAccount: PublicKey,
    bidPrice: number,
    signer: Keypair,
    oraclePriceData: OraclePriceData,
): Promise<TransactionInstruction> {
    const mockProgramPDAs = getMockProgramPDAs(mockTransferProgram.programId);
    const fillsRegistryAddress: PublicKey = await getFillsRegistryAccountAddress(program);
    return await program.methods.buySol(
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
            vaultAccount: mockProgramPDAs.vault,
            protocolTreasuryTokenAccount: mockProgramPDAs.protocolTreasury,
            doubleZeroMint: mockProgramPDAs.tokenMint,
            configAccount: mockProgramPDAs.config,
            revenueDistributionJournal: mockProgramPDAs.journal,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            revenueDistributionProgram: mockTransferProgram.programId,
            signer: signer.publicKey
        })
        .signers([signer])
        .instruction()
}

/// Prepares success scenario and Calls buySolAndVerify.
/// gets Oracle Price and set the bid price based on bidFactor.
/// Mints sufficient 2Z to user and airdrops necessary SOL to Vault.
export async function buySolSuccess(
    program: Program<ConverterProgram>,
    mockTransferProgram: Program<MockTransferProgram>,
    senderTokenAccount: PublicKey,
    signer: Keypair,
    currentConfigs = DEFAULT_CONFIGS,
    bidFactor: number = 1,
) {
    const oraclePriceData = await getOraclePriceData();
    const askPrice = await getConversionPriceAndVerify(program, oraclePriceData);
    const bidPrice = Math.floor(askPrice * bidFactor);

    // Ensure that user has sufficient 2Z.
    await mint2z(
        mockTransferProgram,
        senderTokenAccount,
        bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
    );
    
    // Ensure vault has funds.
    await airdropVault(mockTransferProgram, currentConfigs.solQuantity);
    await buySolAndVerify(
        program, 
        mockTransferProgram, 
        senderTokenAccount, 
        bidPrice, 
        signer, 
        oraclePriceData, 
        currentConfigs
    );
}
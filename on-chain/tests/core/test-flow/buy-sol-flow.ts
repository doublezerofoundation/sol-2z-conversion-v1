import {getMockProgramPDAs} from "../utils/pda-helper";
import {assert, expect} from "chai";
import {Keypair, LAMPORTS_PER_SOL, PublicKey, TransactionInstruction, Transaction} from "@solana/web3.js";
import {BN, Program} from "@coral-xyz/anchor";
import { ConverterProgram } from "../../../target/types/converter_program";
import {getTokenBalance} from "../utils/token-utils";
import * as anchor from "@coral-xyz/anchor";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {getOraclePriceData, OraclePriceData} from "../utils/price-oracle";
import {DEFAULT_CONFIGS} from "../utils/configuration-registry";
import {Fill, FillsRegistry, getFillsRegistryAccount, getFillsRegistryAccountAddress} from "../utils/fills-registry";
import {getConversionPriceAndVerify} from "./conversion-price";
import {mint2z} from "./mock-transfer-program";
import {airdropJournal} from "../utils/mock-transfer-program-utils";
import {fetchProgramState} from "../utils/accounts";
import {findAnchorEventInLogs, getTransactionLogs} from "../utils/return-data";
import {Events, MOCK_TRANSFER_PROGRAM} from "../constants";

export async function buySolAndVerify(
    program: Program<ConverterProgram>,
    senderTokenAccount: PublicKey,
    bidPrice: number,
    signer: Keypair,
    oraclePriceData: OraclePriceData,
    currentConfigs = DEFAULT_CONFIGS,
) {
    const connection = program.provider.connection;
    const pdaList = getMockProgramPDAs();
    const tokenBalanceBefore = await getTokenBalance(connection, senderTokenAccount);
    const protocolTreasuryBalanceBefore = await getTokenBalance(connection, pdaList.protocolTreasury);
    const solBalanceBefore = await connection.getBalance(signer.publicKey);
    const journalBalanceBefore = await connection.getBalance(pdaList.journal);
    const fillsRegistryBefore: FillsRegistry = await getFillsRegistryAccount(program);
    const lastTradedSlotBefore = (await fetchProgramState(program)).lastTradeSlot.toNumber();
    let txSig: string;
    const askPrice = await getConversionPriceAndVerify(program, oraclePriceData, signer);

    try {
        const ix: TransactionInstruction = await prepareBuySolInstruction(
            program,
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

    const tokenChange = (BigInt(Number(currentConfigs.solQuantity)) * BigInt(askPrice)) / BigInt(LAMPORTS_PER_SOL);
    const tokenBalanceChange = Number(tokenChange);
    const solBalanceChange = Number(currentConfigs.solQuantity);

    const tokenBalanceAfter = await getTokenBalance(program.provider.connection, senderTokenAccount);
    const solBalanceAfter = await program.provider.connection.getBalance(signer.publicKey);
    const protocolTreasuryBalanceAfter =
        await getTokenBalance(program.provider.connection, pdaList.protocolTreasury);
    const journalBalanceAfter = await program.provider.connection.getBalance(pdaList.journal);
    const lastTradedSlotAfter = (await fetchProgramState(program)).lastTradeSlot.toNumber();

    // assert whether event has been emitted or not
    const logs = await getTransactionLogs(program.provider, txSig);
    const event = await findAnchorEventInLogs(logs, program.idl, Events.TRADE);
    expect(event, "Trade event should be emitted").to.exist;

    assert.approximately(
        tokenBalanceBefore - tokenBalanceAfter,
        tokenBalanceChange,
        10**4,
        "Token Balance should decrease by tokenBalanceChange"
    )
    assert.approximately(
        protocolTreasuryBalanceAfter - protocolTreasuryBalanceBefore,
        tokenBalanceChange,
        10**4,
        "Token Balance should increase by tokenBalanceChange"
    )
    assert.equal(
        solBalanceAfter - solBalanceBefore,
        solBalanceChange,
        "User's SOL Balance should increase by solBalanceChange"
    )
    assert.equal(
        journalBalanceBefore - journalBalanceAfter,
        solBalanceChange,
        "Journal SOL Balance should decrease by solBalanceChange"
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
    assert.approximately(fillEntry.token2ZOut, tokenBalanceChange, 10 ** 4);
}

export async function buySolFail(
    program: Program<ConverterProgram>,
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
    senderTokenAccount: PublicKey,
    bidPrice: number,
    signer: Keypair,
    oraclePriceData: OraclePriceData,
): Promise<TransactionInstruction> {
    const mockProgramPDAs = getMockProgramPDAs();
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
            protocolTreasuryTokenAccount: mockProgramPDAs.protocolTreasury,
            doubleZeroMint: mockProgramPDAs.tokenMint,
            programConfig: mockProgramPDAs.config,
            journal: mockProgramPDAs.journal,
            tokenProgram: TOKEN_PROGRAM_ID,
            revenueDistributionProgram: MOCK_TRANSFER_PROGRAM,
            signer: signer.publicKey
        })
        .signers([signer])
        .instruction()
}

/// Prepares success scenario and Calls buySolAndVerify.
/// gets Oracle Price and set the bid price based on bidFactor.
/// Mints sufficient 2Z to user and airdrops necessary SOL to journal.
export async function buySolSuccess(
    program: Program<ConverterProgram>,
    senderTokenAccount: PublicKey,
    signer: Keypair,
    currentConfigs = DEFAULT_CONFIGS,
    bidFactor: number = 1,
): Promise<number> {
    const oraclePriceData = await getOraclePriceData();
    const askPrice = await getConversionPriceAndVerify(program, oraclePriceData);
    const bidPrice = Math.floor(askPrice * bidFactor);

    // Ensure that user has sufficient 2Z.
    await mint2z(
        program,
        senderTokenAccount,
        askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
    );

    // Ensure journal has funds.
    await airdropJournal(program, currentConfigs.solQuantity);
    await buySolAndVerify(
        program,
        senderTokenAccount,
        bidPrice,
        signer,
        oraclePriceData,
        currentConfigs
    );
    return askPrice;
}
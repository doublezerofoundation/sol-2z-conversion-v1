import {DEFAULT_CONFIGS} from "./configuration-registry";
import {airdrop} from "./accounts";
import {getMockRevenueDistributionJournal} from "./pda-helper";
import {Program} from "@coral-xyz/anchor";
import {MockTransferProgram} from "../../../../mock-double-zero-program/target/types/mock_transfer_program";
import {assert} from "chai";

export async function airdropJournal(
    mockProgram: Program<MockTransferProgram>,
    solQuantity = DEFAULT_CONFIGS.solQuantity
){
    const connection = mockProgram.provider.connection;
    const quantity = Number(solQuantity);

    const journalPDA = getMockRevenueDistributionJournal(mockProgram.programId);
    const balanceBefore = await connection.getBalance(journalPDA);

    await airdrop(connection, journalPDA, quantity);

    const balanceAfter = await connection.getBalance(journalPDA);

    assert.equal(
        balanceAfter,
        balanceBefore + Number(solQuantity),
        `Journal SOL balance should increase by ${quantity} (before: ${balanceBefore}, after: ${balanceAfter})`
    )
}
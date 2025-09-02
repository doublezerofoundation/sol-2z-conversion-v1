import {DEFAULT_CONFIGS} from "./configuration-registry";
import {airdrop} from "./accounts";
import {getMockRevenueDistributionJournal} from "./pda-helper";
import {Program} from "@coral-xyz/anchor";
import {assert} from "chai";
import {ConverterProgram} from "../../../target/types/converter_program";

export async function airdropJournal(
    program: Program<ConverterProgram>,
    solQuantity = DEFAULT_CONFIGS.solQuantity
){
    const connection = program.provider.connection;
    const quantity = Number(solQuantity);

    const journalPDA = getMockRevenueDistributionJournal();
    const balanceBefore = await connection.getBalance(journalPDA);

    await airdrop(connection, journalPDA, quantity);
    const balanceAfter = await connection.getBalance(journalPDA);

    assert.equal(
        balanceAfter,
        balanceBefore + Number(solQuantity),
        `Journal SOL balance should increase by ${quantity} 
        (before: ${balanceBefore}, after: ${balanceAfter})`
    );
}
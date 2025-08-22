import {DEFAULT_CONFIGS} from "./configuration-registry";
import {airdrop} from "./accounts";
import {getMockVaultPDA} from "./pda-helper";
import {Program} from "@coral-xyz/anchor";
import {MockTransferProgram} from "../../../../mock-double-zero-program/target/types/mock_transfer_program";
import {assert} from "chai";

export async function airdropVault(
    mockProgram: Program<MockTransferProgram>,
    solQuantity = DEFAULT_CONFIGS.solQuantity
){
    const connection = mockProgram.provider.connection;
    const quantity = Number(solQuantity);

    const vaultPDA = getMockVaultPDA(mockProgram.programId);
    const balanceBefore = await connection.getBalance(vaultPDA);

    await airdrop(connection, vaultPDA, quantity);

    const balanceAfter = await connection.getBalance(vaultPDA);

    assert.equal(
        balanceAfter,
        balanceBefore + Number(solQuantity),
        `Vault SOL balance should increase by ${quantity} (before: ${balanceBefore}, after: ${balanceAfter})`
    )
}
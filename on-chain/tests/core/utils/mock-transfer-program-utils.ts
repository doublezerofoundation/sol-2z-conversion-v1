import {DEFAULT_CONFIGS} from "./configuration-registry";
import {airdrop} from "./accounts";
import {getMockVaultPDA} from "./pda-helper";

export async function airdropVault(
    mockProgram,
    solQuantity = DEFAULT_CONFIGS.solQuantity
){
    const vaultPDA = getMockVaultPDA(mockProgram.programId)
    await airdrop(
        mockProgram.provider.connection,
        vaultPDA,
        Number(solQuantity)
    );
}
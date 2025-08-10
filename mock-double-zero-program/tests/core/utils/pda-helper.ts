import {PublicKey} from "@solana/web3.js";
import {Seeds} from "../constants";
import MOCK_VAULT_SEED = Seeds.MOCK_VAULT_SEED;
import MOCK_2Z_TOKEN_MINT_SEED = Seeds.MOCK_2Z_TOKEN_MINT_SEED;
import MOCK_PROTOCOL_TREASURY_SEED = Seeds.MOCK_PROTOCOL_TREASURY_SEED;

export function getMockVaultPDA(mockProgramId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_VAULT_SEED)],
        mockProgramId
    )[0]
}
export function getMockDoubleZeroTokenMintPDA(mockProgramId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_2Z_TOKEN_MINT_SEED)],
        mockProgramId
    )[0]
}
export function getMockProtocolTreasuryAccount(mockProgramId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_PROTOCOL_TREASURY_SEED)],
        mockProgramId
    )[0]
}

export function getMockProgramPDAs(mockProgramId: PublicKey) {
    return {
        tokenMint: getMockDoubleZeroTokenMintPDA(mockProgramId),
        vault: getMockVaultPDA(mockProgramId),
        protocolTreasury: getMockProtocolTreasuryAccount(mockProgramId),
    }
}
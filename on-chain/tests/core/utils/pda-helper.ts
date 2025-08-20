import {PublicKey} from "@solana/web3.js";
import {BPF_UPGRADEABLE_LOADER_ID, Seeds} from "../constants";
import CONFIGURATION_REGISTRY_SEED = Seeds.CONFIGURATION_REGISTRY_SEED;
import PROGRAM_STATE_SEED = Seeds.PROGRAM_STATE_SEED;
import DENY_LIST_REGISTRY_SEED = Seeds.DENY_LIST_REGISTRY_SEED;
import MOCK_VAULT_SEED = Seeds.MOCK_VAULT_SEED;
import MOCK_2Z_TOKEN_MINT_SEED = Seeds.MOCK_2Z_TOKEN_MINT_SEED;
import MOCK_PROTOCOL_TREASURY_SEED = Seeds.MOCK_PROTOCOL_TREASURY_SEED;

export function getConfigurationRegistryPDA(programId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(CONFIGURATION_REGISTRY_SEED)],
        programId
    )[0]
}
export function getProgramStatePDA(programId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(PROGRAM_STATE_SEED)],
        programId
    )[0]
}

export function getDenyListRegistryPDA(programId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(DENY_LIST_REGISTRY_SEED)],
        programId
    )[0]
}

export function getProgramDataAccountPDA(programId: PublicKey) {
    return  PublicKey.findProgramAddressSync(
        [programId.toBytes()],
        BPF_UPGRADEABLE_LOADER_ID
    )[0];
}

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
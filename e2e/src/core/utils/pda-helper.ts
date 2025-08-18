import { PublicKey } from "@solana/web3.js";
import { Seeds } from "../enums/seeds";

const CONFIGURATION_REGISTRY_SEED = Seeds.CONFIGURATION_REGISTRY_SEED;
const PROGRAM_STATE_SEED = Seeds.PROGRAM_STATE_SEED;
const DENY_LIST_REGISTRY_SEED = Seeds.DENY_LIST_REGISTRY_SEED;
const MOCK_VAULT_SEED = Seeds.MOCK_VAULT_SEED;
const MOCK_PROTOCOL_TREASURY_SEED = Seeds.MOCK_PROTOCOL_TREASURY_SEED;
const MOCK_2Z_TOKEN_MINT_SEED = Seeds.MOCK_2Z_TOKEN_MINT_SEED;

const BPF_UPGRADEABLE_LOADER_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

export async function getConfigurationRegistryPDA(programId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(CONFIGURATION_REGISTRY_SEED)],
        programId
    )[0]
}

export async function getProgramStatePDA(programId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(PROGRAM_STATE_SEED)],
        programId
    )[0]
}

export async function getDenyListRegistryPDA(programId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(DENY_LIST_REGISTRY_SEED)],
        programId
    )[0]
}

export async function getProgramDataAccountPDA(programId: PublicKey) {
    return  PublicKey.findProgramAddressSync(
        [programId.toBytes()],
        BPF_UPGRADEABLE_LOADER_ID
    )[0];
}

export async function getMockVaultPDA(mockProgramId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_VAULT_SEED)],
        mockProgramId
    )[0]
}

export async function getMockProtocolTreasuryAccount(mockProgramId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_PROTOCOL_TREASURY_SEED)],
        mockProgramId
    )[0]
}

export async function getMockDoubleZeroTokenMintPDA(mockProgramId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_2Z_TOKEN_MINT_SEED)],
        mockProgramId
    )[0]
}
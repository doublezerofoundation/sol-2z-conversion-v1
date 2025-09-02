import {PublicKey} from "@solana/web3.js";
import {BPF_UPGRADEABLE_LOADER_ID, MOCK_TRANSFER_PROGRAM, Seeds} from "../constants";
import CONFIGURATION_REGISTRY_SEED = Seeds.CONFIGURATION_REGISTRY_SEED;
import PROGRAM_STATE_SEED = Seeds.PROGRAM_STATE_SEED;
import DENY_LIST_REGISTRY_SEED = Seeds.DENY_LIST_REGISTRY_SEED;
import MOCK_2Z_TOKEN_MINT_SEED = Seeds.MOCK_2Z_TOKEN_MINT_SEED;
import MOCK_PROTOCOL_TREASURY_SEED = Seeds.MOCK_PROTOCOL_TREASURY_SEED;
import WITHDRAW_AUTHORITY_SEED = Seeds.WITHDRAW_AUTHORITY_SEED;
import MOCK_CONFIG_ACCOUNT = Seeds.MOCK_CONFIG_ACCOUNT;
import MOCK_REVENUE_DISTRIBUTION_JOURNAL = Seeds.MOCK_REVENUE_DISTRIBUTION_JOURNAL;

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

export function getWithdrawAuthorityPDA(programId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(WITHDRAW_AUTHORITY_SEED)],
        programId
    )[0]
}

export function getProgramDataAccountPDA(programId: PublicKey) {
    return  PublicKey.findProgramAddressSync(
        [programId.toBytes()],
        BPF_UPGRADEABLE_LOADER_ID
    )[0];
}
export function getMockDoubleZeroTokenMintPDA() {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_2Z_TOKEN_MINT_SEED)],
        MOCK_TRANSFER_PROGRAM
    )[0]
}
export function getMockProtocolTreasuryAccount() {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_PROTOCOL_TREASURY_SEED)],
        MOCK_TRANSFER_PROGRAM
    )[0]
}
export function getMockConfig() {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_CONFIG_ACCOUNT)],
        MOCK_TRANSFER_PROGRAM
    )[0]
}

export function getMockRevenueDistributionJournal() {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_REVENUE_DISTRIBUTION_JOURNAL)],
        MOCK_TRANSFER_PROGRAM
    )[0]
}

export function getMockProgramPDAs() {
    return {
        tokenMint: getMockDoubleZeroTokenMintPDA(),
        protocolTreasury: getMockProtocolTreasuryAccount(),
        journal: getMockRevenueDistributionJournal(),
        config: getMockConfig()
    }
}
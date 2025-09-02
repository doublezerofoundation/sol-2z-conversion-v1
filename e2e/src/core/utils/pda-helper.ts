import { PublicKey } from "@solana/web3.js";
import { Seeds } from "../enums/seeds";
import {getConfig} from "./config-util";

const CONFIGURATION_REGISTRY_SEED = Seeds.CONFIGURATION_REGISTRY_SEED;
const PROGRAM_STATE_SEED = Seeds.PROGRAM_STATE_SEED;
const DENY_LIST_REGISTRY_SEED = Seeds.DENY_LIST_REGISTRY_SEED;
const MOCK_PROTOCOL_TREASURY_SEED = Seeds.MOCK_PROTOCOL_TREASURY_SEED;
const MOCK_2Z_TOKEN_MINT_SEED = Seeds.MOCK_2Z_TOKEN_MINT_SEED;
const MOCK_CONFIG_ACCOUNT = Seeds.MOCK_CONFIG_ACCOUNT;
const MOCK_REVENUE_DISTRIBUTION_JOURNAL = Seeds.MOCK_REVENUE_DISTRIBUTION_JOURNAL;

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


export function getMockProtocolTreasuryAccount() {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_PROTOCOL_TREASURY_SEED)],
        new PublicKey(getConfig().double_zero_program_id)
    )[0]
}

export async function getMockDoubleZeroTokenMintPDA() {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_2Z_TOKEN_MINT_SEED)],
        new PublicKey(getConfig().double_zero_program_id)
    )[0]
}

export function getMockConfig() {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_CONFIG_ACCOUNT)],
        new PublicKey(getConfig().double_zero_program_id)
    )[0]
}

export function getMockRevenueDistributionJournal() {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(MOCK_REVENUE_DISTRIBUTION_JOURNAL)],
        new PublicKey(getConfig().double_zero_program_id)
    )[0]
}

export async function getMockProgramPDAs() {
    return {
        tokenMint: await getMockDoubleZeroTokenMintPDA(),
        protocolTreasury: getMockProtocolTreasuryAccount(),
        journal: getMockRevenueDistributionJournal(),
        config: getMockConfig()
    }
}
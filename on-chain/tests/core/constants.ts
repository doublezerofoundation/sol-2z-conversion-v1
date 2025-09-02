import {PublicKey} from "@solana/web3.js";

export const BPF_UPGRADEABLE_LOADER_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
export const MOCK_TRANSFER_PROGRAM = new PublicKey("8S2TYzrr1emJMeQ4FUgKhsLyux3vpMhMojMTNKzPebww");
export const TOKEN_UNITS = 10 ** 8;
export const BPS = 100; // basis points

export const MAX_DENY_LIST_SIZE = 310;

export namespace Seeds {
    export const CONFIGURATION_REGISTRY_SEED = "system_config_v1";
    export const PROGRAM_STATE_SEED = "state_v1";
    export const DENY_LIST_REGISTRY_SEED = "deny_list_v1";
    export const WITHDRAW_AUTHORITY_SEED = "withdraw_sol";
    export const MOCK_PROTOCOL_TREASURY_SEED = "protocol_treasury";
    export const MOCK_2Z_TOKEN_MINT_SEED = "double_zero_mint";
    export const MOCK_CONFIG_ACCOUNT = "config";
    export const MOCK_REVENUE_DISTRIBUTION_JOURNAL = "jour";
}

export namespace Events {
    export const SYSTEM_INITIALIZED = "systemInitialized";
    export const BID_TOO_LOW = "bidTooLowEvent";
    export const SYSTEM_HALTED = "systemHalted";
    export const SYSTEM_UNHALTED = "systemUnhalted";
    export const TRADE = "tradeEvent";
    export const FILLS_CONSUMED = "fillsDequeued";
}

export namespace ErrorMsg {
    export const BID_TOO_LOW = "Provided bid is too low";
    export const ATTESTATION_NOT_AUTHENTIC = "Provided attestation is not authentic";
    export const ATTESTATION_INVALID = "Provided attestation is invalid";
    export const INSUFFICIENT_FUNDS = "insufficient funds";
    export const ACCESS_BY_DENIED_PERSON = "User is blocked in the deny list";
    export const SYSTEM_HALTED = "System is halted";
    export const RAW_CONSTRAINT_VIOLATION = "A raw constraint was violated";
    export const INVALID_COEFFICIENT = "InvalidCoefficient";
    export const INVALID_MAX_DISCOUNT_RATE = "Invalid max discount rate";
    export const UNAUTHORIZED_ADMIN = "Unauthorized admin";
    export const STALE_PRICE = "Provided attestation is outdated";
    export const INVALID_ORACLE_SWAP_RATE = "Invalid oracle swap rate";
    export const ALREADY_IN_DENIED_LIST = "Address already added to deny list";
    export const NOT_FOUND_IN_DENIED_LIST = "Address not found in deny list";
    export const DENY_LIST_FULL = "Deny list is full";
    export const INVALID_MAX_SOL_AMOUNT = "Provided SOL amount for consumption is invalid";
    export const EMPTY_FILLS_REGISTRY = "EmptyFillsRegistry";
    export const UNAUTHORIZED_FILLS_CONSUMER = "User is not authorized to do fills consumption";
    export const ADDRESS_ALREADY_IN_USE = "already in use";
    export const INVALID_SYSTEM_STATE = "Invalid system state";
}

export namespace MockProgramInstructions {
    export const MOCK_SYSTEM_INITIALIZE = "dz::ix::initialize";
    export const MOCK_TOKEN_MINT_INSTRUCTION = "dz::ix::mint2z";
}
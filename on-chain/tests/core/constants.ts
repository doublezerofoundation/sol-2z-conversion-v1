import {PublicKey} from "@solana/web3.js";

export const BPF_UPGRADEABLE_LOADER_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
export const TOKEN_DECIMAL = 10 ** 6

export namespace Seeds {
    export const CONFIGURATION_REGISTRY_SEED = "system_config_v1";
    export const PROGRAM_STATE_SEED = "state_v1";
    export const FILLS_REGISTRY_SEED = "fills_registry_v1";
    export const DENY_LIST_REGISTRY_SEED = "deny_list_v1";
    export const MOCK_VAULT_SEED = "vault";
    export const MOCK_PROTOCOL_TREASURY_SEED = "protocol_treasury";
    export const MOCK_2Z_TOKEN_MINT_SEED = "double_zero_mint";

export const DECIMAL_PRECISION = 10000;

export const PRICE_ORACLE_END_POINT = "https://x5rmshrog9.execute-api.us-east-1.amazonaws.com/test/api/v1/swap-rate";
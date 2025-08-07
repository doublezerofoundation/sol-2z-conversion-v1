import {PublicKey} from "@solana/web3.js";

export const BPF_UPGRADEABLE_LOADER_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

export namespace Seeds {
    export const CONFIGURATION_REGISTRY_SEED = "system_config_v1";
    export const PROGRAM_STATE_SEED = "state_v1";
    export const FILLS_REGISTRY_SEED = "fills_registry_v1";
    export const DENY_LIST_REGISTRY_SEED = "deny_list_v1";
}

export const DECIMAL_PRECISION = 100;

export const PRICE_ORACLE_END_POINT = "https://clic19jsil.execute-api.us-east-1.amazonaws.com/dev4/api/v1/swap-rate";
import {PublicKey} from "@solana/web3.js";
import {BPF_UPGRADEABLE_LOADER_ID, Seeds} from "../constants";
import CONFIGURATION_REGISTRY_SEED = Seeds.CONFIGURATION_REGISTRY_SEED;
import PROGRAM_STATE_SEED = Seeds.PROGRAM_STATE_SEED;
import FILLS_REGISTRY_SEED = Seeds.FILLS_REGISTRY_SEED;
import DENY_LIST_REGISTRY_SEED = Seeds.DENY_LIST_REGISTRY_SEED;

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
export async function getFillsRegistryPDA(programId: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(FILLS_REGISTRY_SEED)],
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
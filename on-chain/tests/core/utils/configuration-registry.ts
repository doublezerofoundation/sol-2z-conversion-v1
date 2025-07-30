import {Connection, PublicKey} from "@solana/web3.js";
import BN from "bn.js";
import * as anchor from "@coral-xyz/anchor";
import {getConfigurationRegistryPDA} from "./pda-helper";

export interface SystemConfig {
    oraclePubkey: PublicKey,
    solQuantity: BN,
    slotThreshold: BN,
    priceMaximumAge: BN,
    maxFillsStorage: BN,
    steepness: BN,
    maxDiscountRate: BN,
}

// Default Configurations
export const DEFAULT_CONFIGS: SystemConfig = {
    oraclePubkey: new PublicKey("3fgp23WcdX4Sex6jRG444b3fZZXtgS4go8XaA8is3FSc"),
    solQuantity: new anchor.BN(2121),
    slotThreshold: new anchor.BN(134),
    priceMaximumAge: new anchor.BN(324),
    maxFillsStorage: new anchor.BN(234),
    steepness: new anchor.BN(9000),
    maxDiscountRate: new anchor.BN(5000),
};

export async function fetchCurrentConfiguration(program): Promise<SystemConfig> {
    const configurationAccountPda = await getConfigurationRegistryPDA(program.programId);
    const configurationRegistry = await program.account.configurationRegistry.fetch(configurationAccountPda);
    return {
        oraclePubkey: configurationRegistry.oraclePubkey,
        solQuantity: configurationRegistry.solQuantity,
        slotThreshold: configurationRegistry.slotThreshold,
        priceMaximumAge: configurationRegistry.priceMaximumAge,
        maxFillsStorage: configurationRegistry.maxFillsStorage,
        steepness: configurationRegistry.steepness,
        maxDiscountRate: configurationRegistry.maxDiscountRate,
    }
}

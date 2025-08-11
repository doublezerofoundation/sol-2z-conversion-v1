import {Connection, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
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
    oraclePubkey: new PublicKey("3FsydTFGUYNQJH7hx97wJiVYhtiDK3gx4ujXNyf1t8Rj"),
    solQuantity: new anchor.BN(21 * LAMPORTS_PER_SOL),
    slotThreshold: new anchor.BN(134),
    priceMaximumAge: new anchor.BN(324),
    maxFillsStorage: new anchor.BN(234),
    steepness: new anchor.BN(90),
    maxDiscountRate: new anchor.BN(50),
};

export async function fetchCurrentConfiguration(program): Promise<SystemConfig> {
    const configurationAccountPda = getConfigurationRegistryPDA(program.programId);
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

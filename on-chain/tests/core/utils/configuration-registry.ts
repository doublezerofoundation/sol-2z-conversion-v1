import {LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import BN from "bn.js";
import * as anchor from "@coral-xyz/anchor";
import {getConfigurationRegistryPDA} from "./pda-helper";
import {BPS} from "../constants";
import { ConverterProgram } from "../../../target/types/converter_program";

export interface SystemConfig {
    oraclePubkey: PublicKey,
    solQuantity: BN,
    slotThreshold: BN,
    priceMaximumAge: BN,
    maxFillsStorage: BN,
    coefficient: BN,
    maxDiscountRate: BN,
    minDiscountRate: BN,
}

// Default Configurations
export const DEFAULT_CONFIGS: SystemConfig = {
    oraclePubkey: new PublicKey("3FsydTFGUYNQJH7hx97wJiVYhtiDK3gx4ujXNyf1t8Rj"),
    solQuantity: new anchor.BN(25 * LAMPORTS_PER_SOL),
    slotThreshold: new anchor.BN(134),
    priceMaximumAge: new anchor.BN(324),
    maxFillsStorage: new anchor.BN(50),
    coefficient: new anchor.BN(9000),
    maxDiscountRate: new anchor.BN(50 * BPS),
    minDiscountRate: new anchor.BN(10 * BPS),
};

export async function fetchCurrentConfiguration(program: anchor.Program<ConverterProgram>): Promise<SystemConfig> {
    const configurationAccountPda = getConfigurationRegistryPDA(program.programId);
    const configurationRegistry = await program.account.configurationRegistry.fetch(configurationAccountPda);
    return {
        oraclePubkey: configurationRegistry.oraclePubkey,
        solQuantity: configurationRegistry.solQuantity,
        slotThreshold: configurationRegistry.slotThreshold,
        priceMaximumAge: configurationRegistry.priceMaximumAge,
        maxFillsStorage: configurationRegistry.maxFillsStorage,
        coefficient: configurationRegistry.coefficient,
        maxDiscountRate: configurationRegistry.maxDiscountRate,
        minDiscountRate: configurationRegistry.minDiscountRate,
    }
}

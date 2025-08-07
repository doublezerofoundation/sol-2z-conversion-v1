import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { CommonScenario } from "../scenarios/common-scenario";

export interface SystemConfig {
    oraclePubkey: PublicKey,
    solQuantity: BN,
    slotThreshold: BN,
    priceMaximumAge: BN,
    maxFillsStorage: BN,
    steepness: BN,
    maxDiscountRate: BN,
}

export interface Test {
    name: string;
    description: string;
    execute: (...args: any[]) => Promise<void>;
}
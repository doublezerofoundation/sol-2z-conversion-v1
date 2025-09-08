import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export interface SystemConfig {
    oraclePubkey: PublicKey,
    solQuantity: BN,
    priceMaximumAge: BN,
    fillsConsumer: PublicKey,
    coefficient: BN,
    maxDiscountRate: BN,
    minDiscountRate: BN,
}

export interface SystemState {
    admin: PublicKey,
    isHalted: boolean,
    bumpRegistry: BumpRegistry,
    lastTradeSlot: BN,
    denyListAuthority: PublicKey,
}

export interface BumpRegistry {
    configurationRegistryBump: BN,
    programStateBump: BN,
    fillsRegistryBump: BN,
    denyListRegistryBump: BN,
}

export interface DenyListRegistry {
    deniedAddresses: PublicKey[],
    lastUpdated: BN,
    updateCount: BN,
}

export interface FillsRegistry {
    totalSolPending: BN,
    total2ZPending: BN,
    fills: Fills[],
    head: BN,
    tail: BN,
    count: BN,
}

export interface Fills {
    solIn: BN,
    token2ZOut: BN,
}

export interface Test {
    name: string;
    description: string;
    execute: (...args: any[]) => Promise<void>;
}
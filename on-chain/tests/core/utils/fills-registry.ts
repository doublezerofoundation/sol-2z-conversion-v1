import {PublicKey} from "@solana/web3.js";
import {getProgramStatePDA} from "./pda-helper";

export interface FillsRegistry {
    totalSolPending: number,
    total2ZPending: number,
    head: number,
    tail: number,
    count: number,
    maxCapacity: number,
    fills: Fill[]
}

export interface Fill {
    solIn: number,
    token2ZOut: number
}

export async function getFillsRegistryAccountAddress(program) : Promise<PublicKey> {
    const stateAccountPDA: PublicKey = getProgramStatePDA(program.programId);
    const stateAccount = await program.account.programStateAccount.fetch(stateAccountPDA);
    return stateAccount.fillsRegistryAddress;
}

export async function getFillsRegistryAccount(program): Promise<FillsRegistry> {
    const fillsRegistryAddress = await getFillsRegistryAccountAddress(program);
    const rawFillsRegistry = await program.account.fillsRegistry.fetch(fillsRegistryAddress);
    const fillsRegistry: FillsRegistry = {
        totalSolPending: Number(rawFillsRegistry.totalSolPending),
        total2ZPending: Number(rawFillsRegistry.total2ZPending),
        count: Number(rawFillsRegistry.count),
        head: Number(rawFillsRegistry.head),
        tail: Number(rawFillsRegistry.tail),
        maxCapacity: rawFillsRegistry.fills.length,
        fills: []
    }
    for (let i = 0; i < fillsRegistry.count; i++) {
        const idx = (fillsRegistry.head + i) % fillsRegistry.maxCapacity;
        const fill = rawFillsRegistry.fills[idx];
        fillsRegistry.fills.push({
            solIn: Number(fill.solIn),
            token2ZOut: Number(fill.token2ZOut)
        })
    }
    return fillsRegistry;
}
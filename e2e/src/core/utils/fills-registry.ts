import {PublicKey} from "@solana/web3.js";
import {getProgramStatePDA} from "./pda-helper";
import { ConverterProgram } from "../../../../on-chain/target/types/converter_program";
import { Program } from "@coral-xyz/anchor";
import { FillsRegistry } from "../account-defs";

export async function getFillsRegistryAccountAddress(program: Program<ConverterProgram>) : Promise<PublicKey> {
    const stateAccountPDA: PublicKey = await getProgramStatePDA(program.programId);
    const stateAccount = await program.account.programStateAccount.fetch(stateAccountPDA);
    return stateAccount.fillsRegistryAddress;
}

export async function getFillsRegistry(program: Program<ConverterProgram>) : Promise<FillsRegistry> {
    const fillsRegistryAddress = await getFillsRegistryAccountAddress(program);
    const fillsRegistry = await program.account.fillsRegistry.fetch(fillsRegistryAddress);
    return fillsRegistry as unknown as FillsRegistry;
}
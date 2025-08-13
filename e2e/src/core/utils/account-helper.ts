import { ConverterProgram } from "../../../../on-chain/target/types/converter_program";
import { Program } from "@coral-xyz/anchor";
import { SystemConfig, SystemState } from "../account-defs";
import { getConfigurationRegistryPDA, getProgramStatePDA } from "./pda-helper";
import { PublicKey } from "@solana/web3.js";

export const getProgramStateAccount = async (program: Program<ConverterProgram>) => {
    const programStatePDA = await getProgramStatePDA(program.programId);
    const programStateAccount = await program.account.programStateAccount.fetch(programStatePDA);
    return programStateAccount as SystemState;
}

export const getConfigurationRegistryAccount = async (program: Program<ConverterProgram>) => {
    const configurationRegistryPDA = await getConfigurationRegistryPDA(program.programId);
    const configurationRegistryAccount = await program.account.configurationRegistry.fetch(configurationRegistryPDA);
    return configurationRegistryAccount as SystemConfig;
}

export const getDequeuerList = async (program: Program<ConverterProgram>): Promise<PublicKey[]> => {
    const configurationRegistryPDA = await getConfigurationRegistryPDA(program.programId);
    const configurationRegistryAccount = await program.account.configurationRegistry.fetch(configurationRegistryPDA);
    return configurationRegistryAccount.authorizedDequeuers;
}
import { ConverterProgram } from "../../../../on-chain/target/types/converter_program";
import { MockTransferProgram } from "../../../../mock-double-zero-program/target/types/mock_transfer_program";
import { Program } from "@coral-xyz/anchor";
import { SystemConfig, SystemState } from "../account-defs";
import { getConfigurationRegistryPDA, getProgramStatePDA } from "./pda-helper";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createAssociatedTokenAccount, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

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

export const findOrInitializeAssociatedTokenAccount = async (
    payer: Keypair,
    ataOwner: PublicKey,
    mint: PublicKey,
    program: Program<MockTransferProgram>
) => {
    const associatedTokenAddress = getAssociatedTokenAddressSync(mint, ataOwner, false, TOKEN_2022_PROGRAM_ID);

    const accountInfo = await program.provider.connection.getAccountInfo(associatedTokenAddress);

    if (accountInfo) {
        // console.log("Associated Token exists with address ", associatedTokenAddress);
        return associatedTokenAddress;
    }

    // console.log("Associated Token does not exists. Creating ...");

    return await createAssociatedTokenAccount(
        program.provider.connection,
        payer,
        mint,
        ataOwner,
        {
            commitment: "confirmed"
        },
        TOKEN_2022_PROGRAM_ID
    );
}
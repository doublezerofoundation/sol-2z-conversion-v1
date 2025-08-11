import { ConverterProgram } from "../../../../on-chain/target/types/converter_program";
import { Program } from "@coral-xyz/anchor";
import { SystemState } from "../account-defs";
import { getProgramStatePDA } from "./pda-helper";

export const getProgramStateAccount = async (program: Program<ConverterProgram>) => {
    const programStatePDA = await getProgramStatePDA(program.programId);
    const programStateAccount = await program.account.programStateAccount.fetch(programStatePDA);
    return programStateAccount as SystemState;
}
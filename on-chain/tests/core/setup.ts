import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../../target/types/converter_program";
import { SystemConfig } from "./utils/configuration-registry";

export const setup = async (): Promise<Program<ConverterProgram>> => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.converterProgram as Program<ConverterProgram>;
  return program;
};

export interface Test {
    name: string;
    description: string;
    execute: (program: Program<ConverterProgram>, ...args: any[]) => Promise<void>;
}

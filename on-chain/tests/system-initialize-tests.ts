import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../target/types/converter_program";
import {airdrop, getDefaultKeyPair} from "./core/utils/account-utils";
import {DEFAULT_CONFIGS} from "./core/utils/configuration-registry";
import {systemInitializeAndVerify, systemInitializeFail} from "./core/test-flow/system-initialize";

describe("System Initialization Tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.converterProgram as Program<ConverterProgram>;
  const adminKeyPair = getDefaultKeyPair();

  it("Person who doesn't have upgrade authority should not init the system!", async () => {
    const nonAdminUserKeyPair = anchor.web3.Keypair.generate();
    await airdrop(program.provider.connection, nonAdminUserKeyPair.publicKey);
    await systemInitializeFail(
        program,
        nonAdminUserKeyPair,
        DEFAULT_CONFIGS,
        "A raw constraint was violated"
    )
  });

  it("Person with upgrade authority can init the system!", async () => {
    await systemInitializeAndVerify(
        program,
        adminKeyPair,
        DEFAULT_CONFIGS
    )
  });

  it("It should not be possible to call init instruction after successful Initialization", async () => {
    await systemInitializeFail(
        program,
        adminKeyPair,
        DEFAULT_CONFIGS,
        "already in use"
    )
  });

});

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { ConverterProgram } from "../target/types/converter_program";
import { getDefaultKeyPair } from "./core/utils/account";
import { setAdminAndVerify, setAdminAndVerifyFail } from "./core/test-flow/set-admin";

describe("Admin Change Tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.converterProgram as Program<ConverterProgram>;
  const adminKeyPair = getDefaultKeyPair();

  it("Program deployer can set admin", async () => {
    const newAdmin = Keypair.generate();
    await setAdminAndVerify(program, adminKeyPair, newAdmin.publicKey);

    // Revert: Set admin back to adminKeyPair
    await setAdminAndVerify(program, adminKeyPair, adminKeyPair.publicKey);
  });

  it("Should fail to set admin if not program deployer", async () => {
    const newAdmin = Keypair.generate();
    await setAdminAndVerifyFail(program, newAdmin, adminKeyPair.publicKey, "A raw constraint was violated");
  });
});
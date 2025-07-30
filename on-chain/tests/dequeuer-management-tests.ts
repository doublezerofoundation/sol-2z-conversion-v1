import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../target/types/converter_program";
import { airdrop, getDefaultKeyPair } from "./core/utils/accounts";
import { DEFAULT_CONFIGS } from "./core/utils/configuration-registry";
import { systemInitializeAndVerify } from "./core/test-flow/system-initialize";
import {
  addDequeuerAndVerify,
  removeDequeuerAndVerify,
  addDequeuerExpectUnauthorized,
  removeDequeuerExpectUnauthorized,
} from "./core/test-flow/dequeuer-management";

describe("Dequeuer Management Tests", () => {

  before(async () => {
    await systemInitializeAndVerify(program, adminKeyPair);
  });
    
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.converterProgram as Program<ConverterProgram>;
  const adminKeyPair = getDefaultKeyPair();
  const nonAdmin = anchor.web3.Keypair.generate();
  const dequeuer = anchor.web3.Keypair.generate().publicKey;

  it("Non-admin cannot add a dequeuer", async () => {
    await addDequeuerExpectUnauthorized(program, nonAdmin, dequeuer);
  });

  it("Admin can add a dequeuer", async () => {
    await addDequeuerAndVerify(program, adminKeyPair, dequeuer);
  });

  it("Adding the same dequeuer twice should not fail", async () => {
    await addDequeuerAndVerify(program, adminKeyPair, dequeuer, false);
  });

  it("Non-admin cannot remove a dequeuer", async () => {
    await removeDequeuerExpectUnauthorized(program, nonAdmin, dequeuer);
  });

  it("Admin can remove a dequeuer", async () => {
    await removeDequeuerAndVerify(program, adminKeyPair, dequeuer);
  });

  it("Removing a non-existing dequeuer should not fail", async () => {
    await removeDequeuerAndVerify(
      program,
      adminKeyPair,
      anchor.web3.Keypair.generate().publicKey,
      false
    );
  });
});

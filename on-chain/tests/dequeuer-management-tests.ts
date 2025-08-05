import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../target/types/converter_program";
import { airdrop, getDefaultKeyPair } from "./core/utils/accounts";
import { DEFAULT_CONFIGS } from "./core/utils/configuration-registry";
import {initializeSystemIfNeeded, systemInitializeAndVerify} from "./core/test-flow/system-initialize";
import {
  addDequeuerAndVerify,
  removeDequeuerAndVerify,
  addDequeuerExpectUnauthorized,
  removeDequeuerExpectUnauthorized,
  addDequeuerExpectMaxLimit,
} from "./core/test-flow/dequeuer-management";
import { setup } from "./core/setup";

describe("Dequeuer Management Tests", async () => {
  const program = await setup();

  before("Initialize the system if needed", async () => {
    await initializeSystemIfNeeded(program)
  });

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

  it("Cannot add more than the maximum number of authorized dequeuers", async () => {
    // MAX_AUTHORIZED_DEQUEUERS is 20 in Rust, so use 20 unique pubkeys
    const dequeuerList = Array.from({ length: 20 }, () => anchor.web3.Keypair.generate().publicKey);
    await addDequeuerExpectMaxLimit(program, adminKeyPair, dequeuerList);
  });
});

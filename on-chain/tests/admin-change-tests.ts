import { Keypair } from "@solana/web3.js";
import { getDefaultKeyPair } from "./core/utils/accounts";
import { setAdminAndVerify, setAdminAndVerifyFail } from "./core/test-flow/set-admin";
import { setup } from "./core/setup";
import { initializeSystemIfNeeded } from "./core/test-flow/system-initialize";

describe("Admin Change Tests", async () => {
  const program = await setup();
  const adminKeyPair = getDefaultKeyPair();

  before("Initialize the system if needed", async () => {
    await initializeSystemIfNeeded(program)
  });

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
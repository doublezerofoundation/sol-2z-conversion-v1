import { Keypair } from "@solana/web3.js";
import { getDefaultKeyPair } from "./core/utils/accounts";
import { setAdminAndVerify, setAdminAndVerifyFail } from "./core/test-flow/set-admin";
import { setup } from "./core/setup";
import { initializeSystemIfNeeded } from "./core/test-flow/system-initialize";
import { setDenyListAuthorityAndVerify, setDenyListAuthorityShouldFail } from "./core/test-flow/deny-list";
import {ErrorMsg} from "./core/constants";

describe("Admin Change Tests", async () => {
  const program = await setup();
  const adminKeyPair = getDefaultKeyPair();

  before("Initialize the system if needed", async () => {
    await initializeSystemIfNeeded(program)
  });

  it("Program deployer can set admin", async () => {
    const newAdmin = Keypair.generate();
    await setAdminAndVerify(program, newAdmin.publicKey, adminKeyPair);

    // Revert: Set admin back to adminKeyPair
    await setAdminAndVerify(program, adminKeyPair.publicKey, adminKeyPair);
  });

  it("Should fail to set admin if not program deployer", async () => {
    const newAdmin = Keypair.generate();
    await setAdminAndVerifyFail(program, newAdmin, adminKeyPair.publicKey, ErrorMsg.RAW_CONSTRAINT_VIOLATION);
  });

  it("Program deployer can set deny list authority", async () => {
    const newDenyListAuthority = Keypair.generate();
    await setDenyListAuthorityAndVerify(program, newDenyListAuthority.publicKey);
  });

  it("Should fail to set deny list authority if not program deployer", async () => {
    const newDenyListAuthority = Keypair.generate();
    await setDenyListAuthorityShouldFail(program, newDenyListAuthority.publicKey, ErrorMsg.RAW_CONSTRAINT_VIOLATION, newDenyListAuthority);
  });
});
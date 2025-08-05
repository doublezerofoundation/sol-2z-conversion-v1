import * as anchor from "@coral-xyz/anchor";
import { setup } from "./core/setup";
import { airdrop, getDefaultKeyPair, getRandomKeyPair } from "./core/utils/accounts";
import { DEFAULT_CONFIGS } from "./core/utils/configuration-registry";
import { updateConfigsAndVerify, updateConfigsAndVerifyFail } from "./core/test-flow/change-configs";
import { initializeSystemIfNeeded } from "./core/test-flow/system-initialize";

describe("Config Update Tests", async () => {
  const program = await setup();
  const adminKeyPair = getDefaultKeyPair();

  before("Initialize the system if needed", async () => {
    await initializeSystemIfNeeded(program)
  });

  it("Non admin user should not be able to update config", async () => {
    const nonAdminUserKeyPair = await getRandomKeyPair(program.provider.connection);
    await airdrop(program.provider.connection, nonAdminUserKeyPair.publicKey);
    await updateConfigsAndVerifyFail(
      program,
      nonAdminUserKeyPair,
      DEFAULT_CONFIGS,
      "Unauthorized Admin"
    )
  });

  it("Admin user should be able to update config", async () => {
    const newConfig = {
      ...DEFAULT_CONFIGS,
      solQuantity: new anchor.BN(10000),
      slotThreshold: new anchor.BN(100),
      priceMaximumAge: new anchor.BN(100),
      maxFillsStorage: new anchor.BN(100),
      steepness: new anchor.BN(100),
      maxDiscountRate: new anchor.BN(100),
    };
    await updateConfigsAndVerify(
      program,
      adminKeyPair,
      newConfig
    );

    // return the config to original values
    await updateConfigsAndVerify(
      program,
      adminKeyPair,
      DEFAULT_CONFIGS
    );
  });

  it("Admin user should not be able to update config with invalid values", async () => {
    const newConfig = {
      invalidKey: new anchor.BN(10000),
    };
    await updateConfigsAndVerifyFail(
      program,
      adminKeyPair,
      newConfig,
      ""
    )
  });
});
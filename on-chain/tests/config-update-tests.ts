import * as anchor from "@coral-xyz/anchor";
import { setup } from "./core/setup";
import { airdrop, getRandomKeyPair } from "./core/utils/accounts";
import { DEFAULT_CONFIGS } from "./core/utils/configuration-registry";
import { updateConfigsAndVerify, updateConfigsAndVerifyFail } from "./core/test-flow/change-configs";
import { initializeSystemIfNeeded } from "./core/test-flow/system-initialize";

describe("Config Update Tests", async () => {
  const program = await setup();

  before("Initialize the system if needed", async () => {
    await initializeSystemIfNeeded(program)
  });

  it("Non admin user should not be able to update config", async () => {
    const nonAdminUserKeyPair = await getRandomKeyPair(program.provider.connection);
    await airdrop(program.provider.connection, nonAdminUserKeyPair.publicKey, 5000000000);
    await updateConfigsAndVerifyFail(
      program,
      DEFAULT_CONFIGS,
      "Unauthorized Admin",
      nonAdminUserKeyPair
    )
  });

  it("Admin user should be able to update config", async () => {
    const newConfig = {
      ...DEFAULT_CONFIGS,
      solQuantity: new anchor.BN(10000),
      priceMaximumAge: new anchor.BN(100),
      coefficient: new anchor.BN(100),
      maxDiscountRate: new anchor.BN(5600),
      minDiscountRate: new anchor.BN(440),
    };
    await updateConfigsAndVerify(
      program,
      newConfig
    );

    // return the config to original values
    await updateConfigsAndVerify(
      program,
      DEFAULT_CONFIGS
    );
  });

  it("Admin user should not be able to update config with invalid values", async () => {
    const newConfig = {
      invalidKey: new anchor.BN(10000),
    };
    await updateConfigsAndVerifyFail(
      program,
      newConfig,
      ""
    )
  });

  it("should fail to update with invalid max discount rate", async () => {
    // Set max discount rate to 10000
    await updateConfigsAndVerifyFail(program, {
      ...DEFAULT_CONFIGS,
      maxDiscountRate: new anchor.BN(10001),
    },
      "Invalid max discount rate"
    );

    // Revert: Set max discount rate to 5000
    await updateConfigsAndVerify(program, DEFAULT_CONFIGS);
  });

  it("should fail to get conversion price for invalid min discount rate", async () => {
    // Set min discount rate to 5001
    await updateConfigsAndVerifyFail(program, {
      ...DEFAULT_CONFIGS,
      maxDiscountRate: new anchor.BN(5000),
      minDiscountRate: new anchor.BN(5001)
    },
      "Invalid min discount rate"
    );

    // Revert: Set min discount rate to 500
    await updateConfigsAndVerify(program, DEFAULT_CONFIGS);
  });
});
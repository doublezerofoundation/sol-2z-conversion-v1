import * as anchor from "@coral-xyz/anchor";
import { setup } from "./core/setup";
import {airdrop, getDefaultKeyPair, getRandomKeyPair} from "./core/utils/accounts";
import { DEFAULT_CONFIGS } from "./core/utils/configuration-registry";
import { updateConfigsAndVerify, updateConfigsAndVerifyFail } from "./core/test-flow/change-configs";
import { initializeSystemIfNeeded } from "./core/test-flow/system-initialize";
import {setFillsConsumerAndVerify, setFillsConsumerExpectUnauthorized} from "./core/test-flow/set-fills-consumer";

describe("Configuration Registry Update Tests", async () => {
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
      "Unauthorized admin",
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

  it("should fail to update with invalid min discount rate", async () => {
    // Set min discount rate to 5001
    await updateConfigsAndVerifyFail(program, {
      ...DEFAULT_CONFIGS,
      maxDiscountRate: new anchor.BN(5000),
      minDiscountRate: new anchor.BN(5001)
    },
      "Invalid max discount rate"
    );

    // Revert: Set min discount rate to 500
    await updateConfigsAndVerify(program, DEFAULT_CONFIGS);
  });

  it("It should be possible to add lower values for max discount rate and min discount rate", async () => {
    await updateConfigsAndVerify(program, {
      ...DEFAULT_CONFIGS,
      maxDiscountRate: new anchor.BN(400),
      minDiscountRate: new anchor.BN(300)
    });

    await updateConfigsAndVerify(program, DEFAULT_CONFIGS);
  });

  it("Should fail to update with invalid coefficient", async () => {

    // Set coefficient to 100000001
    await updateConfigsAndVerifyFail(program, {
      ...DEFAULT_CONFIGS,
      coefficient: new anchor.BN(100000001)
    },
      "InvalidCoefficient"
    );

    // Revert: Set coefficient to default
    await updateConfigsAndVerify(program, DEFAULT_CONFIGS);
  });

    describe("Set Fills Consumer Tests", async () => {
        it("Non-admin cannot add a fills consumer", async () => {
            const nonAdmin = anchor.web3.Keypair.generate();
            const fillsConsumer = anchor.web3.Keypair.generate().publicKey;
            await setFillsConsumerExpectUnauthorized(program, nonAdmin, fillsConsumer);
        });

        it("Admin can add a fills consumer", async () => {
            const fillsConsumer = anchor.web3.Keypair.generate().publicKey;
            await setFillsConsumerAndVerify(program, getDefaultKeyPair(), fillsConsumer);
        });
    });
});
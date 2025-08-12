import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../target/types/converter_program";
import { airdropToActivateAccount, getDefaultKeyPair } from "./core/utils/accounts";
import { DEFAULT_CONFIGS } from "./core/utils/configuration-registry";
import { updateConfigsAndVerify, updateConfigsAndVerifyFail } from "./core/test-flow/change-configs";
import {initializeSystemIfNeeded} from "./core/test-flow/system-initialize";

describe("Config Update Tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.converterProgram as Program<ConverterProgram>;
  const adminKeyPair = getDefaultKeyPair();

  before("Initialize the system if needed", async () => {
    await initializeSystemIfNeeded(program)
  });

  it("Non admin user should not be able to update config", async () => {
    const nonAdminUserKeyPair = anchor.web3.Keypair.generate();
    await airdropToActivateAccount(program.provider.connection, nonAdminUserKeyPair.publicKey);
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
        coefficient: new anchor.BN(100),
        maxDiscountRate: new anchor.BN(100),
        minDiscountRate: new anchor.BN(100),
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
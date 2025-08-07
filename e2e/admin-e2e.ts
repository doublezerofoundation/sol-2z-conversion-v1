import { setup } from "../core/setup";

import { Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../on-chain/target/types/converter_program";
import { Test } from "../core/setup";
import { getDefaultKeyPair, getRandomKeyPair } from "../core/utils/accounts";
import { systemInitializeAndVerify, systemInitializeFail } from "../core/test-flow/system-initialize";
import { Keypair } from "@solana/web3.js";
import { DEFAULT_CONFIGS, SystemConfig } from "../core/utils/configuration-registry";
import { addDequeuerAndVerify, removeDequeuerAndVerify } from "../core/test-flow/dequeuer-management";
import { updateConfigsAndVerify } from "../core/test-flow/change-configs";
import { getConversionPriceAndVerify } from "../core/test-flow/conversion-price";
import { addToDenyListAndVerify, removeFromDenyListAndVerify } from "../core/test-flow/deny-list";
import * as anchor from "@coral-xyz/anchor";
import { setAdminAndVerify } from "../core/test-flow/set-admin";

export interface AdminTestArgs {
  systemConfig?: SystemConfig;
  dequeuer?: Keypair;
  denyAccount?: Keypair;
  newAdmin?: Keypair;
}

const adminTestList: Test[] = [
  {
    name: "add_dequeuer",
    description: "Admin should be able to add authorised dequeuer and emit dequeuerAdded event",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      const admin = getDefaultKeyPair();
      await addDequeuerAndVerify(program, admin, args.dequeuer.publicKey, true);
    }
  },
  {
    name: "config_update",
    description: "Admin should be able to update configs",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      await updateConfigsAndVerify(program, args.systemConfig);
    }
  },
  {
    name: "check_updated_configs",
    description: "Verify whether the ask price is updated with the new configs",
    execute: async (program: Program<ConverterProgram>) => {
      await getConversionPriceAndVerify(program);
    }
  },
  {
    name: "check_dequeuer_can_read_fills",
    description: "Added dequeuer should be able to read fills",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      // TODO: Yet to be implemented
    }
  },
  {
    name: "remove_dequeuer",
    description: "Admin should be able to remove authorised dequeuer and emit dequeuerRemoved event",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      const admin = getDefaultKeyPair();
      await removeDequeuerAndVerify(program, admin, args.dequeuer.publicKey, true);
    }
  },
  {
    name: "check_removed_dequeuer_cannot_read_fills",
    description: "Removed dequeuer should not be able to read fills",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      // TODO: Yet to be implemented
    }
  },
  {
    name: "withdraw_2z",
    description: "Admin should be able to withdraw 2z from the vault",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      // TODO: Yet to be implemented
    }
  },
  {
    name: "add_deny_list",
    description: "Admin should be able to add accounts to the deny list",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      await addToDenyListAndVerify(program, args.denyAccount.publicKey);
    }
  },
  {
    name: "check_deny_user_action",
    description: "Deny list accounts should not be able to perform trade actions",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      // TODO: Yet to be implemented
    }
  },
  {
    name: "remove_deny_list",
    description: "Admin should be able to remove accounts from the deny list",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      await removeFromDenyListAndVerify(program, args.denyAccount.publicKey);
    }
  },
  {
    name: "check_deny_user_action_after_removal",
    description: "Deny list accounts should be able to perform actions after removal",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      // TODO: Yet to be implemented
    }
  },
  {
    name: "change_admin",
    description: "Deployer should be able to change the admin",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      // Set the new admin
      await setAdminAndVerify(program, args.newAdmin.publicKey);
    }
  },
  {
    name: "new_admin_can_do_admin_actions",
    description: "New admin should be able to do admin actions",
    execute: async (program: Program<ConverterProgram>, args: AdminTestArgs) => {
      // Add a dequeuer
      const dequeuer = await getRandomKeyPair(program.provider.connection);
      await addDequeuerAndVerify(program, args.newAdmin, dequeuer.publicKey, true);
      await removeDequeuerAndVerify(program, args.newAdmin, dequeuer.publicKey, true);

      // Add a deny list account
      const denyAccount = await getRandomKeyPair(program.provider.connection);
      await addToDenyListAndVerify(program, denyAccount.publicKey, args.newAdmin);
      await removeFromDenyListAndVerify(program, denyAccount.publicKey, args.newAdmin);

      // Update configs
      await updateConfigsAndVerify(program, args.systemConfig, args.newAdmin);

      // Revert: Set admin back to deployer
      const deployer = getDefaultKeyPair();
      await setAdminAndVerify(program, deployer.publicKey);
    }
  }
];

describe("Admin E2E", () => {
  let program: Program<ConverterProgram>;
  let args: AdminTestArgs;

  before(async () => {
    program = await setup();
    args = {
      systemConfig: {
        ...DEFAULT_CONFIGS,
        solQuantity: new anchor.BN(100),
      },
      dequeuer: await getRandomKeyPair(program.provider.connection),
      denyAccount: await getRandomKeyPair(program.provider.connection),
      newAdmin: await getRandomKeyPair(program.provider.connection)
    };
  });

  for (const [i, test] of adminTestList.entries()) {
    it(`▶️  ADMIN-${i + 1}: ${test.description}`, async () => {
      await test.execute(program, args);
    });
  }
});
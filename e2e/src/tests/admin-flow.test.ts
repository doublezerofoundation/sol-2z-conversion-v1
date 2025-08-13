import { describe } from "mocha";
import { Test } from "../core/account-defs";
import { AdminClient } from "../core/admin-client";
import { InitializeScenario } from "../scenarios/initialize-scenario";
import { extractTxHashFromResult, getTestName } from "../core/utils/test-helper";
import { DEFAULT_KEYPAIR_PATH } from "../core/constants";
import { DenyListScenario } from "../scenarios/deny-list-scenario";
import { PublicKey } from "@solana/web3.js";
import { UserClient } from "../core/user-client";
import { AdminChangeScenario } from "../scenarios/admin-change-scenario";
import { ConfigScenario } from "../scenarios/config-scenario";
import { DequeuerScenario } from "../scenarios/dequeuer-scenario";
import { WithdrawScenario } from "../scenarios/withdraw-scenario";
import { SystemStateScenario } from "../scenarios/system-state-scenario";
import { getConfig } from "../core/utils/config-util";
import { eventExists } from "../core/utils/assertions";
import { assert } from "chai";

const initializationTests: Test[] = [
    {
        name: "non_deployer_init_system_fail",
        description: "Non-deployer should not be able to initialize the system",
        execute: async (scenario: any, invalidScenario: InitializeScenario) => {
            await invalidScenario.initializeSystemAndVerifyFail("");
        }
    },
    {
        name: "deployer_init_system",
        description: "Deployer should be able to initialize the system",
        execute: async (scenario: InitializeScenario) => {
            await scenario.initializeSystemAndVerify();
        }
    },
    {
        name: "deployer_reinit_system_fail",
        description: "Deployer should not be able to re-initialize the system",
        execute: async (scenario: InitializeScenario) => {
            await scenario.initializeSystemAndVerifyFail("already in use");
        }
    },
]

const setAdminTests: Test[] = [
    {
        name: "set_admin_fail",
        description: "Non-deployer should not be able to set a new admin",
        execute: async (scenario: AdminChangeScenario, invalidScenario: AdminChangeScenario, admin: PublicKey) => {
            await invalidScenario.setAdminAndVerifyFail(admin, "A raw constraint was violated");
        }
    },
    {
        name: "set_admin",
        description: "Deployer should be able to set a new admin",
        execute: async (scenario: AdminChangeScenario, invalidScenario: AdminChangeScenario, admin: PublicKey) => {
            await scenario.setAdminAndVerify(admin);
        }
    },
    {
        name: "admin_cannot_set_admin",
        description: "Admin cannot change admin to another admin",
        execute: async (scenario: AdminChangeScenario, invalidScenario: AdminChangeScenario, admin: PublicKey) => {
            await invalidScenario.setAdminAndVerifyFail(admin, "A raw constraint was violated");
        }
    }
]

const configUpdateTests: Test[] = [
    {
        name: "config_update_fail",
        description: "Non-admin should not be able to update the config",
        execute: async (scenario: ConfigScenario, invalidScenario: ConfigScenario) => {
            await invalidScenario.updateConfigAndVerifyFail("Unauthorized Admin");
        }
    },
    {
        name: "config_update",
        description: "Admin should be able to update the config",
        execute: async (scenario: ConfigScenario, invalidScenario: ConfigScenario) => {
            let config = getConfig();
            config.max_discount_rate = 3440;
            await scenario.updateConfigAndVerify(config);
        }
    },
    {
        name: "config_update_fail_invalid_max_discount_rate",
        description: "Admin should not be able to update the config with an invalid max discount rate",
        execute: async (scenario: ConfigScenario, invalidScenario: ConfigScenario) => {
            let config = getConfig();
            config.max_discount_rate = 10001;
            await invalidScenario.updateConfigAndVerifyFail("Invalid max discount rate", config);
        }
    },
    {
        name: "config_update_fail_invalid_min_discount_rate",
        description: "Admin should not be able to update the config with an invalid min discount rate",
        execute: async (scenario: ConfigScenario, invalidScenario: ConfigScenario) => {
            let config = getConfig();
            config.min_discount_rate = 10001;
            await invalidScenario.updateConfigAndVerifyFail("Invalid min discount rate", config);
        }
    }
]

const denyListTests: Test[] = [
    {
        name: "deny_list_add_user",
        description: "New admin should be able to add a user to the deny list",
        execute: async (scenario: DenyListScenario, invalidScenario: DenyListScenario, user: PublicKey) => {
            await scenario.addUserToDenyListAndVerify(user);
        }
    },
    {
        name: "deny_list_add_user_fail",
        description: "Non-admin should not be able to add a user to the deny list",
        execute: async (scenario: DenyListScenario, invalidScenario: DenyListScenario, user: PublicKey) => {
            await invalidScenario.addUserToDenyListAndVerifyFail(user, "Unauthorized Admin");
        }
    },
    {
        name: "deny_list_user_already_in_deny_list_fail",
        description: "Adding a user that is already in the deny list should fail",
        execute: async (scenario: DenyListScenario, invalidScenario: DenyListScenario, user: PublicKey) => {
            await scenario.addUserToDenyListAndVerifyFail(user, "Address already added to Deny List");
        }
    },
    {
        name: "deny_list_user_cannot_buy_sol",
        description: "User in deny list should not be able to buy SOL",
        execute: async (scenario: DenyListScenario) => {
            //TODO: add test
        }
    },
    {
        name: "deny_list_remove_user_fail",
        description: "Non-admin should not be able to remove a user from the deny list",
        execute: async (scenario: DenyListScenario, invalidScenario: DenyListScenario, user: PublicKey) => {
            await invalidScenario.removeUserFromDenyListAndVerifyFail(user, "Unauthorized Admin");
        }
    },
    {
        name: "deny_list_remove_user",
        description: "Admin should be able to remove a user from the deny list",
        execute: async (scenario: DenyListScenario, invalidScenario: DenyListScenario, user: PublicKey) => {
            await scenario.removeUserFromDenyListAndVerify(user);
        }
    },
    {
        name: "deny_list_remove_user_fail_invalid_user",
        description: "Removing a user that is not in the deny list should fail",
        execute: async (scenario: DenyListScenario, invalidScenario: DenyListScenario, user: PublicKey) => {
            await scenario.removeUserFromDenyListAndVerifyFail(user, "Address not found in Deny List");
        }
    },
    {
        name: "user_can_buy_sol_after_removal_from_deny_list",
        description: "User can buy SOL after removal from deny list",
        execute: async (scenario: DenyListScenario) => {
            //TODO: add test
        }
    }
]

const dequeuerTests: Test[] = [
    {
        name: "dequeuer_add_fail",
        description: "Non-admin should not be able to add a dequeuer",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            await invalidScenario.addDequeuerAndVerifyFail(dequeuer, "Unauthorized Admin");
        }
    },
    {
        name: "dequeuer_add",
        description: "Admin should be able to add a dequeuer",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            await scenario.addDequeuerAndVerify(dequeuer);
        }
    },
    {
        name: "authorized_dequeuer_can_dequeue_fills",
        description: "Authorized dequeuer should be able to dequeue fills",
        execute: async (scenario: DequeuerScenario) => {
            //TODO: add test
        }
    },
    {
        name: "dequeuer_add_fail_invalid_dequeuer",
        description: "Adding an invalid dequeuer should fail",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            const result = await scenario.addDequeuerAndVerify(dequeuer);
            const txHash = extractTxHashFromResult(result);

            // Check for DequeuerAdded event
            if (await eventExists(scenario.getConnection(), txHash, "DequeuerAdded")) {
                assert.fail("DequeuerAdded should not be emitted");
            } else {
                assert.ok(true, "DequeuerAdded event should not be emitted");
            }
        }
    },
    {
        name: "dequeuer_remove_fail",
        description: "Non-admin should not be able to remove a dequeuer",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            await invalidScenario.removeDequeuerAndVerifyFail(dequeuer, "Unauthorized Admin");
        }
    },
    {
        name: "dequeuer_remove",
        description: "Admin should be able to remove a dequeuer",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            await scenario.removeDequeuerAndVerify(dequeuer);
        }
    },
    {
        name: "dequeuer_remove_fail_invalid_dequeuer",
        description: "Removing an invalid dequeuer should fail",
        execute: async (scenario: DequeuerScenario, invalidScenario: DequeuerScenario, dequeuer: string) => {
            const result = await scenario.removeDequeuerAndVerify(dequeuer);
            const txHash = extractTxHashFromResult(result);

            // Check for DequeuerRemoved event
            if (await eventExists(scenario.getConnection(), txHash, "DequeuerRemoved")) {
                assert.fail("DequeuerRemoved should not be emitted");
            } else {
                assert.ok(true, "DequeuerRemoved event should not be emitted");
            }
        }
    }
]

const withdrawTests: Test[] = [
    {
        name: "withdraw_tokens_fail",
        description: "Non-admin should not be able to withdraw tokens",
        execute: async (scenario: WithdrawScenario, invalidScenario: WithdrawScenario) => {
            // TODO: add test
            // const amount = 100;
            // const destination = "0x0000000000000000000000000000000000000000";
            // await invalidScenario.withdrawTokensAndVerifyFail(amount, destination, "Unauthorized Admin");
        }
    },
    {
        name: "withdraw_tokens",
        description: "Admin should be able to withdraw tokens",
        execute: async (scenario: WithdrawScenario, invalidScenario: WithdrawScenario) => {
            // TODO: add test
            const amount = 100;
            const destination = "0x0000000000000000000000000000000000000000";
            await scenario.withdrawTokensAndVerify(amount, destination);
        }
    },
    {
        name: "withdraw_tokens_fail_invalid_amount",
        description: "Withdrawing an invalid amount should fail",
        execute: async (scenario: WithdrawScenario, invalidScenario: WithdrawScenario) => {
            // TODO: add test
            // const amount = 9999999999999;
            // const destination = "0x0000000000000000000000000000000000000000";
            // await scenario.withdrawTokensAndVerifyFail(amount, destination, "Invalid amount");
        }
    }
]

const systemStateTests: Test[] = [
    {
        name: "system_state_toggle_fail",
        description: "Non-admin should not be able to toggle the system state",
        execute: async (scenario: SystemStateScenario, invalidScenario: SystemStateScenario) => {
            await invalidScenario.toggleSystemStateAndVerifyFail(true, "Unauthorized Admin");
        }
    },
    {
        name: "system_state_toggle",
        description: "Admin should be able to toggle the system state",
        execute: async (scenario: SystemStateScenario, invalidScenario: SystemStateScenario) => {
            await scenario.toggleSystemStateAndVerify(true);
        }
    },
    {
        name: "system_state_toggle_fail_invalid_state",
        description: "Admin should not be able to toggle the system state to the same state",
        execute: async (scenario: SystemStateScenario, invalidScenario: SystemStateScenario) => {
            await scenario.toggleSystemStateAndVerifyFail(true, "Invalid system state");
        }
    }
]

describe("Admin E2E Tests", () => {
    let deployer: AdminClient;
    let nonDeployerAdmin: AdminClient;
    let invalidAdmin: AdminClient;
    let dequeuer: UserClient;

    before(async () => {
        deployer = await AdminClient.create(DEFAULT_KEYPAIR_PATH);
        nonDeployerAdmin = await AdminClient.create()
        invalidAdmin = await AdminClient.create()
        dequeuer = await UserClient.create();
    });

    describe("System Initialization", () => {
        let deployerScenario: InitializeScenario;
        let nonDeployerScenario: InitializeScenario;

        before(async () => {
            deployerScenario = new InitializeScenario(deployer);
            nonDeployerScenario = new InitializeScenario(nonDeployerAdmin);
        });
        for (const [i, test] of initializationTests.entries()) {
            it(getTestName("INIT", i+1, test.description), async () => {
                await test.execute(deployerScenario, nonDeployerScenario);
            });
        }
    });

    describe("Admin Change", () => {
        let deployerScenario: AdminChangeScenario;
        let adminScenario: AdminChangeScenario;
        before(async () => {
            deployerScenario = new AdminChangeScenario(deployer);
            adminScenario = new AdminChangeScenario(nonDeployerAdmin);
        });
        for (const [i, test] of setAdminTests.entries()) {
            it(getTestName("SET_ADMIN", i+1, test.description), async () => {
                await test.execute(deployerScenario, adminScenario, nonDeployerAdmin.session.getPublicKey());
            });
        }
    });

    describe("Config Update Tests", () => {
        let adminScenario: ConfigScenario;
        let nonAdminScenario: ConfigScenario;
        before(async () => {
            adminScenario = new ConfigScenario(nonDeployerAdmin);
            nonAdminScenario = new ConfigScenario(invalidAdmin);
        });
        after(async () => {
            // Reset the config
            let config = getConfig();
            config.max_discount_rate = 5000;
            config.min_discount_rate = 500;
            await adminScenario.updateConfigAndVerify(config);
        });
        for (const [i, test] of configUpdateTests.entries()) {
            it(getTestName("CONFIG_UPDATE", i+1, test.description), async () => {
                await test.execute(adminScenario, nonAdminScenario);
            });
        }
    });

    describe("Deny List Tests", () => {
        let user: UserClient;
        let validScenario: DenyListScenario;
        let invalidScenario: DenyListScenario;
        before(async () => {
            user = await UserClient.create();
            validScenario = new DenyListScenario(nonDeployerAdmin);
            invalidScenario = new DenyListScenario(invalidAdmin);
        });

        for (const [i, test] of denyListTests.entries()) {
            it(getTestName("DENY_LIST", i+1, test.description), async () => {
                await test.execute(validScenario, invalidScenario, user.session.getPublicKey());
            });
        }
    });

    describe("Dequeuer Tests", () => {
        let adminScenario: DequeuerScenario;
        let nonAdminScenario: DequeuerScenario;
        before(async () => {
            adminScenario = new DequeuerScenario(nonDeployerAdmin);
            nonAdminScenario = new DequeuerScenario(invalidAdmin);
        });
        for (const [i, test] of dequeuerTests.entries()) {
            it(getTestName("DEQUEUER", i+1, test.description), async () => {
                await test.execute(adminScenario, nonAdminScenario, dequeuer.session.getPublicKey().toString());
            });
        }
    });

    describe("Withdraw Tests", () => {
        let adminScenario: WithdrawScenario;
        let nonAdminScenario: WithdrawScenario;
        before(async () => {
            adminScenario = new WithdrawScenario(nonDeployerAdmin);
            nonAdminScenario = new WithdrawScenario(invalidAdmin);
        });
        for (const [i, test] of withdrawTests.entries()) {
            it(getTestName("WITHDRAW", i+1, test.description), async () => {
                await test.execute(adminScenario, nonAdminScenario);
            });
        }
    });

    describe("System State Tests", () => {
        let adminScenario: SystemStateScenario;
        let nonAdminScenario: SystemStateScenario;
        before(async () => {
            adminScenario = new SystemStateScenario(nonDeployerAdmin);
            nonAdminScenario = new SystemStateScenario(invalidAdmin);
        });
        for (const [i, test] of systemStateTests.entries()) {
            it(getTestName("SYSTEM_STATE", i+1, test.description), async () => {
                await test.execute(adminScenario, nonAdminScenario);
            });
        }
    });
});

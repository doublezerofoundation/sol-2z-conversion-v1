import { describe } from "mocha";
import { SystemConfig, Test } from "../core/account-defs";
import { AdminClient } from "../core/admin-client";
import { InitializeScenario } from "../scenarios/initialize-scenario";
import { getTestName } from "../core/utils/test-helper";
import { DEFAULT_KEYPAIR_PATH } from "../core/constants";
import { DenyListScenario } from "../scenarios/deny-list-scenario";
import { PublicKey } from "@solana/web3.js";
import { UserClient } from "../core/user-client";
import { AdminChangeScenario } from "../scenarios/admin-change-scenario";
import { ConfigScenario } from "../scenarios/config-scenario";
import { config } from "process";

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

const denyListTests: Test[] = [
    {
        name: "deny_list_add_user",
        description: "Admin should be able to add a user to the deny list",
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
        execute: async (scenario: ConfigScenario, invalidScenario: ConfigScenario, config: SystemConfig) => {
            await scenario.updateConfigAndVerify(config);
        }
    }
]

describe("Admin E2E Tests", () => {
    let deployer: AdminClient;
    let nonDeployerAdmin: AdminClient;
    let invalidAdmin: AdminClient;

    before(async () => {
        deployer = await AdminClient.create(DEFAULT_KEYPAIR_PATH);
        nonDeployerAdmin = await AdminClient.create()
        invalidAdmin = await AdminClient.create()
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
});

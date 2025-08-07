import { describe } from "mocha";
import { Test } from "../core/account-defs";
import { AdminClient } from "../core/admin-client";
import { InitializeScenario } from "../scenarios/initialize-scenario";
import { getTestName } from "../core/utils/test-helper";
import { DEFAULT_KEYPAIR_PATH } from "../core/constants";
import { DenyListScenario } from "../scenarios/deny-list-scenario";
import { PublicKey } from "@solana/web3.js";

const initializationTests: Test[] = [
    {
        name: "non_deployer_init_system_fail",
        description: "Non-deployer should not be able to initialize the system",
        execute: async (scenario: any, invalidScenario: InitializeScenario) => {
            await invalidScenario.initializeSystemAndVerifyFail("A raw constraint was violated");
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
            await invalidScenario.addUserToDenyListAndVerifyFail(user, "A raw constraint was violated");
        }
    },
    {
        name: "deny_list_user_already_in_deny_list_fail",
        description: "Adding a user that is already in the deny list should fail",
        execute: async (scenario: DenyListScenario) => {
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
        execute: async (scenario: DenyListScenario) => {
        }
    },
    {
        name: "deny_list_remove_user",
        description: "Admin should be able to remove a user from the deny list",
        execute: async (scenario: DenyListScenario) => {
        }
    },
    {
        name: "deny_list_remove_user_fail_invalid_user",
        description: "Removing a user that is not in the deny list should fail",
        execute: async (scenario: DenyListScenario) => {
        }
    },
    {
        name: "user_can_buy_sol_after_removal_from_deny_list",
        description: "User can buy SOL after removal from deny list",
        execute: async (scenario: DenyListScenario) => {
        }
    }
]

describe("Admin E2E Tests", () => {
    let deployer: AdminClient;
    let nonDeployerAdmin: AdminClient;

    before(async () => {
        deployer = await AdminClient.create(DEFAULT_KEYPAIR_PATH);
        nonDeployerAdmin = await AdminClient.create()
    });

    describe("System Initialization", () => {
        let deployerScenario: InitializeScenario;
        let nonDeployerScenario: InitializeScenario;

        before(async () => {
            deployerScenario = new InitializeScenario(deployer);
            nonDeployerScenario = new InitializeScenario(nonDeployerAdmin);
        });
        for (const [i, test] of initializationTests.entries()) {
            it(getTestName("INIT", i, test.description), async () => {
                await test.execute(deployerScenario, nonDeployerScenario);
            });
        }
    });

    describe("Deny List Tests", () => {

        for (const [i, test] of denyListTests.entries()) {
            it(getTestName("DL", i, test.description), async () => {
                await test.execute();
            });
        }
    });
});

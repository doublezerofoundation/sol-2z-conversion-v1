import { describe } from "mocha";
import { Test } from "../core/account-defs";
import { AdminClient } from "../core/admin-client";
import { InitializeScenario } from "../scenarios/initialize-scenario";
import { getTestName } from "../core/utils/test-helper";
import { DEFAULT_KEYPAIR_PATH } from "../core/constants";

const InitializationTestList: Test[] = [
    {
        name: "non_deployer_init_system_fail",
        description: "Non-deployer should not be able to initialize the system",
        execute: async (scenario: any, invalidScenario: InitializeScenario) => {
            await invalidScenario.initializeSystemAndVerifyFail();
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
            await scenario.initializeSystemAndVerifyFail();
        }
    },
]

describe("Admin E2E Tests", () => {
    describe("System Initialization", () => {
        let deployerScenario: InitializeScenario;
        let nonDeployerScenario: InitializeScenario;

        before(async () => {
            const deployer = await AdminClient.create(DEFAULT_KEYPAIR_PATH);
            const nonDeployer = await AdminClient.create();
            deployerScenario = new InitializeScenario(deployer);
            nonDeployerScenario = new InitializeScenario(nonDeployer);
        });

        for (const [i, test] of InitializationTestList.entries()) {
            it(getTestName("INIT", i, test.description), async () => {
                await test.execute(deployerScenario, nonDeployerScenario);
            });
        }
    });
});

import { AdminClient } from "./core/admin-client";
import { DEFAULT_KEYPAIR_PATH } from "./core/constants";
import { UserClient } from "./core/user-client";
import { getTestName } from "./core/utils/test-helper";
import { InitializeScenario } from "./scenarios/initialize-scenario";
import { UserQueryScenario } from "./scenarios/user-query-scenario";

import { userQueryTests } from "./tests/user/user-query.test";
import { userBuySolTests } from "./tests/user/buy-sol.test";
import { dequeuerUserTests } from "./tests/user/fills-consumer-user.test";
import { BuySolScenario } from "./scenarios/buy-sol-scenario";
import { DequeuerScenario } from "./scenarios/fills-consumer-scenario";

describe("User Flow Tests", () => {
    let deployer: AdminClient;
    let nonDeployerAdmin: AdminClient;
    let invalidAdmin: AdminClient;
    let user: UserClient;

    before(async () => {
        deployer = await AdminClient.create(DEFAULT_KEYPAIR_PATH);
        nonDeployerAdmin = await AdminClient.create()
        invalidAdmin = await AdminClient.create()
        user = await UserClient.create();

        // Initialize the system
        const initializeScenario = new InitializeScenario(deployer);
        await initializeScenario.setup(
            nonDeployerAdmin.session.getPublicKey(),
            nonDeployerAdmin.session.getPublicKey()
        );
    });

    describe("User Query Tests", () => {
        let scenario: UserQueryScenario;

        before(async () => {
            scenario = new UserQueryScenario(nonDeployerAdmin, user);
        });

        for (const [i, test] of userQueryTests.entries()) {
            it(getTestName("QUERY", i + 1, test.description), async () => {
                await test.execute(scenario);
            });
        }
    });

    describe("User Buy Sol Tests", () => {
        let scenario: BuySolScenario;

        before(async () => {
            scenario = new BuySolScenario(nonDeployerAdmin, user);
        });

        for (const [i, test] of userBuySolTests.entries()) {
            it(getTestName("BUY_SOL", i + 1, test.description), async () => {
                await test.execute(scenario);
            });
        }
    });

    describe("User Dequeue Fill Tests", () => {
        let scenario: DequeuerScenario;

        before(async () => {
            scenario = new DequeuerScenario(nonDeployerAdmin, user);
        });

        for (const [i, test] of dequeuerUserTests.entries()) {
            it(getTestName("DEQUEUE", i + 1, test.description), async () => {
                await test.execute(scenario);
            });
        }
    });
});

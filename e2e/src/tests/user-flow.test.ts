import { Test } from "../core/account-defs";
import { AdminClient } from "../core/admin-client";
import { DEFAULT_KEYPAIR_PATH } from "../core/constants";
import { UserClient } from "../core/user-client";
import { InitializeScenario } from "../scenarios/initialize-scenario";
import { UserQueryScenario } from "../scenarios/user-query-scenario";

const userBuyTests: Test[] = []

const denyListTests: Test[] = []

const dequeueFillTests: Test[] = []

describe("User Flow Tests", () => {
    let deployer: AdminClient;
    let nonDeployerAdmin: AdminClient;
    let invalidAdmin: AdminClient;
    let dequeuer: UserClient;

    before(async () => {
        deployer = await AdminClient.create(DEFAULT_KEYPAIR_PATH);
        nonDeployerAdmin = await AdminClient.create()
        invalidAdmin = await AdminClient.create()
        dequeuer = await UserClient.create();

        // Initialize the system
        const initializeScenario = new InitializeScenario(deployer);
        await initializeScenario.initializeSystemAndVerify();
        await deployer.initMockProgramCommand();
    });

    require("./user-query");
});



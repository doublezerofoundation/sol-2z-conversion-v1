import { Test } from "../core/account-defs";
import { AdminClient } from "../core/admin-client";
import { DEFAULT_KEYPAIR_PATH } from "../core/constants";
import { UserClient } from "../core/user-client";
import { getTestName } from "../core/utils/test-helper";
import { UserQueryScenario } from "../scenarios/user-query-scenario";

const userQueryTests: Test[] = [
    {
        name: "get_price",
        description: "User can query to get the current conversion rate for 2Z to SOL conversion",
        execute: async (scenario: UserQueryScenario) => {
            await scenario.getPriceAndVerify();
        },
    },
    {
        name: "get_quantity",
        description: "User can query to get the current quantity of SOL to 2Z conversion",
        execute: async (scenario: UserQueryScenario) => {
            await scenario.getQuantityAndVerify();
        },
    },
];

describe("User Query Tests", () => {
    let admin: AdminClient;
    let user: UserClient;
    let scenario: UserQueryScenario;

    before(async () => {
        admin = await AdminClient.create(DEFAULT_KEYPAIR_PATH);
        user = await UserClient.create();
        scenario = new UserQueryScenario(admin, user);
    });

    for (const [i, test] of userQueryTests.entries()) {
        it(getTestName("USER_QUERY", i+1, test.description), async () => {
            await test.execute(scenario);
        });
    }
});
import { Test } from "../../core/account-defs";
import { UserQueryScenario } from "../../scenarios/user-query-scenario";

export const userQueryTests: Test[] = [
    {
        name: "get_price",
        description: "User can query to get the current conversion rate for 2Z to SOL conversion",
        execute: async (scenario: UserQueryScenario) => {
            await scenario.getPriceAndVerify();
        },
    },
    {
        name: "get_price_fail_for_deny_listed_user",
        description: "User should not be able to query the price if they are in the deny list",
        execute: async (scenario: UserQueryScenario) => {
            await scenario.addUserToDenyList(scenario.getUserPublicKey());
            await scenario.getPriceAndVerifyFail("User is blocked in the deny list");

            // Reset deny list
            await scenario.removeUserFromDenyList(scenario.getUserPublicKey());
        }
    },
    {
        name: "get_quantity",
        description: "User can query to get the current quantity of SOL to 2Z conversion",
        execute: async (scenario: UserQueryScenario) => {
            await scenario.getQuantityAndVerify();
        },
    },
];
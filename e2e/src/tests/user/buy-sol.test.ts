import { Test } from "../../core/account-defs";
import { TOKEN_DECIMALS } from "../../core/constants";
import { getOraclePriceData } from "../../core/utils/price-oracle";
import { BuySolScenario } from "../../scenarios/buy-sol-scenario";

export const userBuySolTests: Test[] = [
    {
        name: "user_buy_sol_fail",
        description: "User should not be able to buy SOL if they don't have enough 2Z",
        execute: async (scenario: BuySolScenario) => {
            const oraclePrice = await getOraclePriceData();
            const amount = (oraclePrice.swapRate / TOKEN_DECIMALS) + 5
            await scenario.buySolAndVerifyFail(amount, "Insufficient funds");
        }
    },
    {
        name: "user_buy_sol_fail",
        description: "User should not be able to buy SOL if the system is halted",
        execute: async (scenario: BuySolScenario) => {
            await scenario.toggleSystemState(true);
            await scenario.buySolAndVerifyFail(20, "System is halted");

            // Reset system state
            await scenario.toggleSystemState(false);
        }
    },
    {
        name: "user_buy_sol_fail_for_deny_list",
        description: "User should not be able to buy SOL if they are in the deny list",
        execute: async (scenario: BuySolScenario) => {
            await scenario.addUserToDenyList(scenario.getUserPublicKey());
            await scenario.buySolAndVerifyFail(20, "User is in the deny list");

            // Reset deny list
            await scenario.removeUserFromDenyList(scenario.getUserPublicKey());
        }
    },
    {
        name: "user_buy_sol_success",
        description: "User should be able to buy SOL if they have enough 2Z",
        execute: async (scenario: BuySolScenario) => {
            const oraclePrice = await getOraclePriceData();
            const amount = (oraclePrice.swapRate / TOKEN_DECIMALS) + 5
            await scenario.buySolAndVerify(amount);
        }
    }
]

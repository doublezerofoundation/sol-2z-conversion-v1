import { expect } from "chai";
import { Test } from "../../core/account-defs";
import { TOKEN_DECIMALS } from "../../core/constants";
import { eventExists, eventExistsInErrorLogs } from "../../core/utils/assertions";
import { getOraclePriceData } from "../../core/utils/price-oracle";
import { BuySolScenario } from "../../scenarios/buy-sol-scenario";
import { extractTxHashFromResult } from "../../core/utils/test-helper";

export const userBuySolTests: Test[] = [
    {
        name: "user_buy_sol_fail_insufficient_funds",
        description: "User should not be able to buy SOL if they don't have enough 2Z",
        execute: async (scenario: BuySolScenario) => {
            const oraclePrice = await getOraclePriceData();
            const amount = (oraclePrice.swapRate / TOKEN_DECIMALS) + 5
            await scenario.buySolAndVerifyFail(amount, "insufficient funds");
        }
    },
    {
        name: "user_buy_sol_fail_system_halted",
        description: "User should not be able to buy SOL if the system is halted",
        execute: async (scenario: BuySolScenario) => {
            await scenario.toggleSystemState(true);
            await scenario.buySolAndVerifyFail(20, "System is halted");

            // Reset system state
            await scenario.toggleSystemState(false);
        }
    },
    {
        name: "user_buy_sol_fail_deny_list",
        description: "User should not be able to buy SOL if they are in the deny list",
        execute: async (scenario: BuySolScenario) => {
            await scenario.addUserToDenyList(scenario.getUserPublicKey());
            await scenario.buySolAndVerifyFail(20, "User is blocked in the DenyList");

            // Reset deny list
            await scenario.removeUserFromDenyList(scenario.getUserPublicKey());
        }
    },
    {
        name: "user_buy_sol_fail_invalid_attestation",
        description: "User should not be able to buy SOL if they have an invalid attestation",
        execute: async (scenario: BuySolScenario) => {
            // Covered in unit tests
        }
    },
    {
        name: "user_buy_sol_fail_bid_too_low",
        description: "User should not be able to buy SOL if the bid is too low",
        execute: async (scenario: BuySolScenario) => {
            const oraclePrice = await getOraclePriceData();
            const amount = (oraclePrice.swapRate / TOKEN_DECIMALS) - 10
            await scenario.checkAndReimburseUser2ZBalance(amount);
            await scenario.checkAndReimburseVaultSolBalance();

            const result = await scenario.buySolAndVerifyFail(amount, "Provided bid is too low");
            const eventExists = await eventExistsInErrorLogs(result, "BidTooLowEvent");
            expect(eventExists).to.be.true;
        }
    },
    {
        name: "user_buy_sol_success",
        description: "User should be able to buy SOL if they have enough 2Z",
        execute: async (scenario: BuySolScenario) => {
            const oraclePrice = await getOraclePriceData();
            const amount = (oraclePrice.swapRate / TOKEN_DECIMALS) + 1
            await scenario.buySolAndVerify(amount);
        }
    },
    {
        name: "user_buy_sol_event_is_emitted",
        description: "TradeEvent should be emitted when a user buys SOL",
        execute: async (scenario: BuySolScenario) => {
            const oraclePrice = await getOraclePriceData();
            const amount = (oraclePrice.swapRate / TOKEN_DECIMALS) + 1
            const result = await scenario.buySolAndVerify(amount);

            const txHash = extractTxHashFromResult(result);
            const eventEmmited = await eventExists(scenario.getConnection(), txHash, "TradeEvent");
            expect(eventEmmited).to.be.true;
        }
    },
    {
        name: "fill_registry_is_updated_when_user_buys_sol",
        description: "Fill registry should be updated when a user buys SOL",
        execute: async (scenario: BuySolScenario) => {
            const fillsRegistry = await scenario.getFillsRegistry();
            const initialFills = fillsRegistry.count.toNumber();

            const oraclePrice = await getOraclePriceData();
            const amount = (oraclePrice.swapRate / TOKEN_DECIMALS) + 1
            await scenario.buySolAndVerify(amount);

            const finalFillsRegistry = await scenario.getFillsRegistry();
            const finalFills = finalFillsRegistry.count.toNumber();
            expect(finalFills).to.be.equal(initialFills + 1);
        }
    }
]

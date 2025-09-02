import { expect } from "chai";
import { Test } from "../../core/account-defs";
import { TOKEN_DECIMALS } from "../../core/constants";
import { eventExists, eventExistsInErrorLogs } from "../../core/utils/assertions";
import { getOraclePriceData } from "../../core/utils/price-oracle";
import { BuySolScenario } from "../../scenarios/buy-sol-scenario";
import { extractTxHashFromResult } from "../../core/utils/test-helper";
import { getConfig, updateConfig } from "../../core/utils/config-util";

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
            await scenario.buySolAndVerifyFail(20, "User is blocked in the deny list");

            // Reset deny list
            await scenario.removeUserFromDenyList(scenario.getUserPublicKey());
        }
    },
    {
        name: "user_buy_sol_fail_invalid_attestation",
        description: "User should not be able to buy SOL if they have an invalid attestation",
        execute: async (scenario: BuySolScenario) => {
            let oraclePrice = await getOraclePriceData();

            // tamper with the attestation
            oraclePrice.swapRate = 3233;
            await scenario.buySolAndVerifyFailWithAttestation(20, oraclePrice, "Provided attestation is not authentic");
        }
    },
    {
        name: "buy_sol_fail_for_stale_attestation",
        description: "User should not be able to buy SOL if the oracle price is stale",
        execute: async (scenario: BuySolScenario) => {
            let oraclePrice = await getOraclePriceData();

            // update price max age to be low
            const config = getConfig();
            config.price_maximum_age = 1;
            updateConfig(config);

            // update configureation registry
            await scenario.updateConfig();

            // wait for 2 seconds
            await new Promise(resolve => setTimeout(resolve, 2000));

            // buy sol and verify fail
            const bidAmount = (oraclePrice.swapRate / TOKEN_DECIMALS) + 5;
            await scenario.buySolAndVerifyFailWithAttestation(bidAmount, oraclePrice, "Provided attestation is outdated");

            // reset config
            config.price_maximum_age = 500;
            updateConfig(config);

            // update configureation registry
            await scenario.updateConfig();
        }
    },
    {
        name: "user_buy_sol_fail_bid_too_low",
        description: "User should not be able to buy SOL if the bid is too low",
        execute: async (scenario: BuySolScenario) => {
            const oraclePrice = await getOraclePriceData();
            const amount = (oraclePrice.swapRate / TOKEN_DECIMALS) - 10
            await scenario.checkAndReimburseUser2ZBalance(amount);
            await scenario.checkAndReimburseJournalSolBalance();

            const result = await scenario.buySolAndVerifyFail(amount, "Provided bid is too low");
        }
    },
    {
        name: "bid_too_low_event_is_emitted",
        description: "BidTooLowEvent should be emitted if the bid is too low",
        execute: async (scenario: BuySolScenario) => {
            const oraclePrice = await getOraclePriceData();
            const amount = (oraclePrice.swapRate / TOKEN_DECIMALS) - 10;
            await scenario.checkAndReimburseUser2ZBalance(amount);
            await scenario.checkAndReimburseJournalSolBalance();

            const result = await scenario.buySolAndVerifyFail(amount, "Provided bid is too low");
            const eventExists = await eventExistsInErrorLogs(result, "BidTooLowEvent");
            expect(eventExists).to.be.true;
        }
    },
    {
        name: "user_buy_sol_success",
        description: "User should be able to buy SOL if they have enough 2Z",
        execute: async (scenario: BuySolScenario) => {
            // Set low coefficient to avoid rounding errors
            const config = getConfig();
            config.coefficient = 1;
            updateConfig(config);

            // update configureation registry
            await scenario.updateConfig();

            // buy sol and verify
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
            const oraclePrice = await getOraclePriceData();
            const amount = (oraclePrice.swapRate / TOKEN_DECIMALS) + 1
            await scenario.buySolAndVerify(amount);
            // verification is covered in the buySolAndVerify function
        }
    },
    {
        name: "user_buy_sol_fail_same_slot",
        description: "User should not be able to buy SOL twice in the same slot",
        execute: async (scenario: BuySolScenario) => {
            const oraclePrice = await getOraclePriceData();
            const amount = (oraclePrice.swapRate / TOKEN_DECIMALS) + 1

            // Ensure user has enough balance for both attempts
            await scenario.checkAndReimburseUser2ZBalance(amount * 6);
            await scenario.airdropToJournal(30 * 6);

            // Wait for 3 seconds to make sure the slot is over
            await new Promise(resolve => setTimeout(resolve, 3000));

            // First buy should succeed
            await scenario.buySol(amount);

            // Try to buy 5 times in the same slot
            for (let i = 0; i < 5; i++) {
                try {
                    await scenario.buySol(amount);
                } catch (error) {
                    expect(error!.toString()).to.contain("Only one trade is allowed per slot");
                    break;
                }
            }
        }
    }
]

import { Test } from "../../core/account-defs";
import { DenyListScenario } from "../../scenarios/deny-list-scenario";
import { PublicKey } from "@solana/web3.js";

export const denyListTests: Test[] = [
    {
        name: "deny_list_add_user",
        description: "New deny authority should be able to add a user to the deny list",
        execute: async (scenario: DenyListScenario, invalidScenario: DenyListScenario, user: PublicKey) => {
            await scenario.addUserToDenyListAndVerify(user);
        }
    },
    {
        name: "deny_list_add_user_fail",
        description: "Non-authority should not be able to add a user to the deny list",
        execute: async (scenario: DenyListScenario, invalidScenario: DenyListScenario, user: PublicKey) => {
            await invalidScenario.addUserToDenyListAndVerifyFail(user, "Unauthorized Deny List Authority");
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
        name: "deny_list_remove_user_fail",
        description: "Non-authority should not be able to remove a user from the deny list",
        execute: async (scenario: DenyListScenario, invalidScenario: DenyListScenario, user: PublicKey) => {
            await invalidScenario.removeUserFromDenyListAndVerifyFail(user, "Unauthorized Deny List Authority");
        }
    },
    {
        name: "deny_list_remove_user",
        description: "Deny authority should be able to remove a user from the deny list",
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
    }
]

import { Test } from "../../core/account-defs";
import { AdminChangeScenario } from "../../scenarios/admin-change-scenario";
import { PublicKey } from "@solana/web3.js";

export const setAdminTests: Test[] = [
    {
        name: "set_admin_fail",
        description: "Non-deployer should not be able to set a new admin",
        execute: async (scenario: AdminChangeScenario, invalidScenario: AdminChangeScenario, admin: PublicKey) => {
            await invalidScenario.setAdminAndVerifyFail(admin, "A raw constraint was violated");
        }
    },
    {
        name: "set_admin",
        description: "Deployer should be able to set a new admin",
        execute: async (scenario: AdminChangeScenario, invalidScenario: AdminChangeScenario, admin: PublicKey) => {
            await scenario.setAdminAndVerify(admin);
        }
    },
    {
        name: "admin_cannot_set_admin",
        description: "Admin cannot change admin to another admin",
        execute: async (scenario: AdminChangeScenario, invalidScenario: AdminChangeScenario, admin: PublicKey) => {
            await invalidScenario.setAdminAndVerifyFail(admin, "A raw constraint was violated");
        }
    },
    {
        name: "set_deny_authority_fail",
        description: "Non-deployer should not be able to set a new deny authority",
        execute: async (scenario: AdminChangeScenario, invalidScenario: AdminChangeScenario, admin: PublicKey) => {
            await invalidScenario.setDenyAuthorityAndVerifyFail(admin, "A raw constraint was violated");
        }
    },
    {
        name: "set_deny_authority",
        description: "Deployer should be able to set a new deny authority",
        execute: async (scenario: AdminChangeScenario, invalidScenario: AdminChangeScenario, admin: PublicKey) => {
            await scenario.setDenyAuthorityAndVerify(admin);
        }
    },
    {
        name: "set_deny_authority_fail_invalid_authority",
        description: "Admin should not be able to set a new deny authority",
        execute: async (scenario: AdminChangeScenario, invalidScenario: AdminChangeScenario, admin: PublicKey) => {
            await invalidScenario.setDenyAuthorityAndVerifyFail(admin, "A raw constraint was violated");
        }
    }
]

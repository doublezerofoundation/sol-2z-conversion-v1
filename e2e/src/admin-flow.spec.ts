import { describe } from "mocha";
import { AdminClient } from "./core/admin-client";
import { InitializeScenario } from "./scenarios/initialize-scenario";
import { getTestName } from "./core/utils/test-helper";
import { DEFAULT_KEYPAIR_PATH } from "./core/constants";
import { DenyListScenario } from "./scenarios/deny-list-scenario";
import { UserClient } from "./core/user-client";
import { AdminChangeScenario } from "./scenarios/admin-change-scenario";
import { ConfigScenario } from "./scenarios/config-scenario";
import { DequeuerScenario } from "./scenarios/dequeuer-scenario";
import { SystemStateScenario } from "./scenarios/system-state-scenario";
import { getConfig } from "./core/utils/config-util";

import { initializationTests } from "./tests/admin/initialization.test";
import { setAdminTests } from "./tests/admin/set-admin.test";
import { configUpdateTests } from "./tests/admin/config.test";
import { denyListTests } from "./tests/admin/deny-list.test";
import { dequeuerTests } from "./tests/admin/dequeuer.test";
import { systemStateTests } from "./tests/admin/system-state.test";

describe("Admin E2E Tests", () => {
    let deployer: AdminClient;
    let nonDeployerAdmin: AdminClient;
    let invalidAdmin: AdminClient;
    let dequeuer: UserClient;

    before(async () => {
        deployer = await AdminClient.create(DEFAULT_KEYPAIR_PATH);
        nonDeployerAdmin = await AdminClient.create()
        invalidAdmin = await AdminClient.create()
        dequeuer = await UserClient.create();
    });

    describe("System Initialization", () => {
        let deployerScenario: InitializeScenario;
        let nonDeployerScenario: InitializeScenario;

        before(async () => {
            deployerScenario = new InitializeScenario(deployer);
            nonDeployerScenario = new InitializeScenario(nonDeployerAdmin);
        });
        for (const [i, test] of initializationTests.entries()) {
            it(getTestName("INIT", i+1, test.description), async () => {
                await test.execute(deployerScenario, nonDeployerScenario);
            });
        }
    });

    describe("Admin Change", () => {
        let deployerScenario: AdminChangeScenario;
        let adminScenario: AdminChangeScenario;
        before(async () => {
            deployerScenario = new AdminChangeScenario(deployer);
            adminScenario = new AdminChangeScenario(nonDeployerAdmin);
        });
        for (const [i, test] of setAdminTests.entries()) {
            it(getTestName("SET_ADMIN", i+1, test.description), async () => {
                await test.execute(deployerScenario, adminScenario, nonDeployerAdmin.session.getPublicKey());
            });
        }
    });

    describe("Config Update Tests", () => {
        let adminScenario: ConfigScenario;
        let nonAdminScenario: ConfigScenario;
        before(async () => {
            adminScenario = new ConfigScenario(nonDeployerAdmin);
            nonAdminScenario = new ConfigScenario(invalidAdmin);
        });
        after(async () => {
            // Reset the config
            let config = getConfig();
            config.max_discount_rate = 5000;
            config.min_discount_rate = 500;
            await adminScenario.updateConfigAndVerify(config);
        });
        for (const [i, test] of configUpdateTests.entries()) {
            it(getTestName("CONFIG_UPDATE", i+1, test.description), async () => {
                await test.execute(adminScenario, nonAdminScenario);
            });
        }
    });

    describe("Deny List Tests", () => {
        let user: UserClient;
        let validScenario: DenyListScenario;
        let invalidScenario: DenyListScenario;
        before(async () => {
            user = await UserClient.create();
            validScenario = new DenyListScenario(nonDeployerAdmin);
            invalidScenario = new DenyListScenario(invalidAdmin);
        });

        for (const [i, test] of denyListTests.entries()) {
            it(getTestName("DENY_LIST", i+1, test.description), async () => {
                await test.execute(validScenario, invalidScenario, user.session.getPublicKey());
            });
        }
    });

    describe("Dequeuer Tests", () => {
        let adminScenario: DequeuerScenario;
        let nonAdminScenario: DequeuerScenario;
        before(async () => {
            adminScenario = new DequeuerScenario(nonDeployerAdmin);
            nonAdminScenario = new DequeuerScenario(invalidAdmin);
        });
        for (const [i, test] of dequeuerTests.entries()) {
            it(getTestName("DEQUEUER", i+1, test.description), async () => {
                await test.execute(adminScenario, nonAdminScenario, dequeuer.session.getPublicKey().toString());
            });
        }
    });

    describe("System State Tests", () => {
        let adminScenario: SystemStateScenario;
        let nonAdminScenario: SystemStateScenario;
        before(async () => {
            adminScenario = new SystemStateScenario(nonDeployerAdmin);
            nonAdminScenario = new SystemStateScenario(invalidAdmin);
        });
        for (const [i, test] of systemStateTests.entries()) {
            it(getTestName("STATE", i+1, test.description), async () => {
                await test.execute(adminScenario, nonAdminScenario);
            });
        }
    });
});

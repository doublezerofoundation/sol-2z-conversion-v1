import { AdminClient } from "../core/admin-client";
import { accountExists } from "../core/utils/assertions";
import { getConfigurationRegistryPDA, getProgramStatePDA, getDenyListRegistryPDA, getFillsRegistryPDA } from "../core/utils/pda-helper";
import { CommonScenario } from "./common-scenario";
import { expect, assert } from "chai";

export class InitializeScenario extends CommonScenario {
    constructor(deployer: AdminClient) {
        super(deployer);
    }

    public async initializeSystemAndVerify(): Promise<void> {
        await this.admin.initializeSystemCommand();

        // Verify that the system is initialized
        const program = this.admin.session.getProgram();
        const connection = this.admin.session.getConnection();
        const pdas = await Promise.all([
            getConfigurationRegistryPDA(program.programId),
            getProgramStatePDA(program.programId),
            getFillsRegistryPDA(program.programId),
            getDenyListRegistryPDA(program.programId),
        ]);

        const [configurationRegistryPDA, programStatePDA, fillsRegistryPDA, denyListRegistryPDA] = pdas;
        const [configRegExists, stateRegExists, fillsRegExists, denyListRegExists] = await Promise.all([
            accountExists(connection, configurationRegistryPDA),
            accountExists(connection, programStatePDA),
            accountExists(connection, fillsRegistryPDA),
            accountExists(connection, denyListRegistryPDA),
        ]);

        expect(configRegExists).to.be.true;
        expect(stateRegExists).to.be.true;
        expect(fillsRegExists).to.be.true;
        expect(denyListRegExists).to.be.true;
    }

    public async initializeSystemAndVerifyFail(expectedError: string = ""): Promise<void> {
        try {
            await this.admin.initializeSystemCommand();
            assert.fail("System should not be initialized");
        } catch (error) {
            this.handleExpectedError(error, expectedError);
        }
    }
}
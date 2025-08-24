import { describe } from "mocha";
import { toggleSystemStateAndVerify, toggleSystemStateAndVerifyFail } from "./core/test-flow/system-state";
import * as anchor from "@coral-xyz/anchor";
import { setup } from "./core/setup";
import { initializeSystemIfNeeded } from "./core/test-flow/system-initialize";

describe("System State Tests", async () => {
    const program = await setup();

    before("Initialize the system if needed", async () => {
        await initializeSystemIfNeeded(program)
    });
    
    it("Admin should be able to toggle system state", async () => {
        try {
            await toggleSystemStateAndVerify(program, false);
        } catch (error) {
            // Ignore: initializing system for unit tests
        }
        await toggleSystemStateAndVerify(program, true);
    });

    it("Should fail to toggle system state if not admin", async () => {
        const newAdmin = anchor.web3.Keypair.generate();
        await toggleSystemStateAndVerifyFail(program, true, "Unauthorized admin", newAdmin);
    });

    it("Should fail to toggle system state if system is already in the desired state", async () => {
        // System is currently halted
        await toggleSystemStateAndVerifyFail(program, true, "Invalid system state");

        // unhalt system
        await toggleSystemStateAndVerify(program, false);
        await toggleSystemStateAndVerifyFail(program, false, "Invalid system state");
    });
});
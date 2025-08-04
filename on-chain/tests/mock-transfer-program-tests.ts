import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MockTransferProgram } from "../target/types/mock_transfer_program";
import {airdrop, getDefaultKeyPair} from "./core/utils/account-utils";
import {DEFAULT_CONFIGS} from "./core/utils/configuration-registry";
import {systemInitializeAndVerify, systemInitializeFail} from "./core/test-flow/system-initialize";
import {initializeMockTransferSystemAndVerify, mint2z} from "./core/test-flow/mock-transfer-program";
import {createTokenAccount} from "./core/utils/token-utils";
import {getMockDoubleZeroTokenMintPDA} from "./core/utils/pda-helper";
import {Keypair, PublicKey} from "@solana/web3.js";

describe("System Initialization Tests", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.mockTransferProgram as Program<MockTransferProgram>;
    let adminKeyPair: Keypair = getDefaultKeyPair();
    let doubleZeroMint: PublicKey;
    let tokenAccount: PublicKey;

    it.skip("Initializing the system!", async () => {
        await initializeMockTransferSystemAndVerify(
            program,
            adminKeyPair,
        )
    });

    it("Buy Sol!", async () => {
        const nonAdminUserKeyPair = anchor.web3.Keypair.generate();
        await airdrop(program.provider.connection, nonAdminUserKeyPair.publicKey);
        doubleZeroMint = getMockDoubleZeroTokenMintPDA(program.programId)
        tokenAccount = await createTokenAccount(program.provider.connection, doubleZeroMint, nonAdminUserKeyPair.publicKey);
        await mint2z( program, tokenAccount,500)
    });

});

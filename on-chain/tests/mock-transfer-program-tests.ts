import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MockTransferProgram } from "../../mock-double-zero-program/target/types/mock_transfer_program";
import mockTransferProgramIdl from "../../mock-double-zero-program/target/idl/mock_transfer_program.json";
import { airdrop, airdropToActivateAccount, getDefaultKeyPair} from "./core/utils/accounts";
import {
    buySol,
    initializeMockTransferSystemIfNeeded,
    mint2z, withdraw_2z
} from "./core/test-flow/mock-transfer-program";
import {createTokenAccount} from "./core/utils/token-utils";
import { getMockProgramPDAs} from "./core/utils/pda-helper";
import {Keypair, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {TOKEN_DECIMAL} from "./core/constants";

describe("System Initialization Tests", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program: Program<MockTransferProgram> = new Program(mockTransferProgramIdl as anchor.Idl, anchor.getProvider());
    let adminKeyPair: Keypair = getDefaultKeyPair();
    let pdas;
    let tokenAccount: PublicKey;
    let userKeyPair: Keypair

    it("Initializing the system!", async () => {
        await initializeMockTransferSystemIfNeeded(
            program,
            adminKeyPair,
        )
    });

    it("Initialize Token Account", async() => {
        userKeyPair = anchor.web3.Keypair.generate();
        await airdropToActivateAccount(program.provider.connection, userKeyPair.publicKey);
        pdas = getMockProgramPDAs(program.programId);
        tokenAccount = await createTokenAccount(program.provider.connection, pdas.tokenMint, userKeyPair.publicKey);
    })

    it("Mint 2Z!", async () => {
        await mint2z(program, tokenAccount, 500 * TOKEN_DECIMAL);
    });

    it("Airdrop vault", async () => {
        await airdrop(program.provider.connection, pdas.vault, 500 * LAMPORTS_PER_SOL);
    });

    it("Buy Sol!", async () => {
        await buySol(
            program,
            tokenAccount,
            500 * TOKEN_DECIMAL,
            200 * LAMPORTS_PER_SOL,
            userKeyPair
        );
    });

    it(" Mint 2Z to Protocol Treasury", async () => {
        await mint2z(
            program, pdas.protocolTreasury, 500 * TOKEN_DECIMAL);
    });

    it("Withdraw 2Z!", async () => {
        await withdraw_2z(program, tokenAccount,600 * TOKEN_DECIMAL, userKeyPair);
    });

});

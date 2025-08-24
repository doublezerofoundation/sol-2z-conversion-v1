import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {MockTransferProgram} from "../../mock-double-zero-program/target/types/mock_transfer_program";
import mockTransferProgramIdl from "../../mock-double-zero-program/target/idl/mock_transfer_program.json";
import {airdrop, getDefaultKeyPair} from "./core/utils/accounts";
import {initializeMockTransferSystemIfNeeded} from "./core/test-flow/mock-transfer-program";
import {createTokenAccount} from "./core/utils/token-utils";
import {getMockProgramPDAs} from "./core/utils/pda-helper";
import {Keypair, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {buySolSuccess} from "./core/test-flow/buy-sol-flow";
import {ConverterProgram} from "../target/types/converter_program";
import {initializeSystemIfNeeded} from "./core/test-flow/system-initialize";
import {DEFAULT_CONFIGS, SystemConfig} from "./core/utils/configuration-registry";
import {updateConfigsAndVerify} from "./core/test-flow/change-configs";
import { setDenyListAuthorityAndVerify} from "./core/test-flow/deny-list";
import {dequeueFillsFail, dequeueFillsSuccess} from "./core/test-flow/dequeue-fills-flow";
import {setFillsConsumerAndVerify} from "./core/test-flow/set-fills-consumer";
import {FillsRegistry, getFillsRegistryAccount} from "./core/utils/fills-registry";
import {assert} from "chai";

describe("Buy Sol Tests", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.converterProgram as Program<ConverterProgram>;
    const mockTransferProgram: Program<MockTransferProgram> = new Program(mockTransferProgramIdl as anchor.Idl, anchor.getProvider());
    let adminKeyPair: Keypair = getDefaultKeyPair();
    let mockTransferProgramPDAs: any;
    let tokenAccountForUser: PublicKey;
    let userKeyPair: Keypair;
    let currentConfigs: SystemConfig;

    before("Set up the system", async() => {
        await initializeSystemIfNeeded(program);
        // Initializing the Mock Transfer system If not already initialized!
        await initializeMockTransferSystemIfNeeded(
            mockTransferProgram,
            adminKeyPair,
        )
        // Set deny list authority to admin
        await setDenyListAuthorityAndVerify(program, adminKeyPair.publicKey);

        // Update configurations to Default Configuration
        await updateConfigsAndVerify(
            program,
            {...DEFAULT_CONFIGS, coefficient: new anchor.BN(1)}
        );

        currentConfigs = DEFAULT_CONFIGS;

        mockTransferProgramPDAs = getMockProgramPDAs(mockTransferProgram.programId);

        // create key pair & token account for user
        userKeyPair = anchor.web3.Keypair.generate();
        await airdrop(
            mockTransferProgram.provider.connection,
            userKeyPair.publicKey,
            10 * LAMPORTS_PER_SOL
        );
        tokenAccountForUser = await createTokenAccount(
            mockTransferProgram.provider.connection,
            mockTransferProgramPDAs.tokenMint,
            userKeyPair.publicKey,
        );
    });

    after("Change configs to Default", async () => {
        await updateConfigsAndVerify(
            program,
            DEFAULT_CONFIGS
        );
    });

    describe("Unauthorized Dequeue Attempt", async() => {
        it("User not in authorized Dequeuers should not dequeue fills", async () => {
            await buySolSuccess(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                userKeyPair,
                currentConfigs,
                1
            );

            await dequeueFillsFail(
                program,
                DEFAULT_CONFIGS.solQuantity,
                userKeyPair,
                "User is not authorized to do dequeue action"
            )
        });
    });


    describe("Authorized user doing the dequeue fills", async() => {
        before("User is added to authorized Dequeuers List", async () => {
            await setFillsConsumerAndVerify(
                program,
                getDefaultKeyPair(),
                userKeyPair.publicKey,
            )
        });

        it("Clear up fills registry", async () => {
            const fillsRegistryBefore: FillsRegistry = await getFillsRegistryAccount(program);

            await dequeueFillsSuccess(
                program,
                new anchor.BN(fillsRegistryBefore.totalSolPending),
                userKeyPair
            )
            const fillsRegistryAfter: FillsRegistry = await getFillsRegistryAccount(program);
            assert.equal(fillsRegistryAfter.totalSolPending, 0)
        });

        it("User should be able to do dequeue fills to empty fills registry", async () => {
            await dequeueFillsSuccess(
                program,
                DEFAULT_CONFIGS.solQuantity,
                userKeyPair
            )
        });

        it("User dequeues 1 fill", async () => {
            await buySolSuccess(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                userKeyPair,
                currentConfigs,
                1
            );

            await dequeueFillsSuccess(
                program,
                DEFAULT_CONFIGS.solQuantity,
                userKeyPair
            )
        });

        it("User dequeues 5 fills", async () => {
            for (let i = 0; i < 5; i++) {
                await buySolSuccess(
                    program,
                    mockTransferProgram,
                    tokenAccountForUser,
                    userKeyPair,
                    currentConfigs,
                    1.1
                );
            }

            await dequeueFillsSuccess(
                program,
                new anchor.BN(5 * Number(DEFAULT_CONFIGS.solQuantity)),
                userKeyPair
            )
        });
    });
});
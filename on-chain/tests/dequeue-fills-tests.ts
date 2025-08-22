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

describe("Dequeue Fills Tests", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.converterProgram as Program<ConverterProgram>;
    const mockTransferProgram: Program<MockTransferProgram> = new Program(mockTransferProgramIdl as anchor.Idl, anchor.getProvider());
    let adminKeyPair: Keypair = getDefaultKeyPair();
    let mockTransferProgramPDAs: any;
    let tokenAccountForUser: PublicKey;
    let userKeyPair: Keypair;
    let currentConfigs: SystemConfig;
    let maxSolAmount: number;
    let expectedTokenDequeued: number;
    let expectedFillsConsumed: number;

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
                "User is not authorized to do Dequeue Action"
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

            maxSolAmount = fillsRegistryBefore.totalSolPending;
            expectedTokenDequeued = fillsRegistryBefore.total2ZPending;
            expectedFillsConsumed = fillsRegistryBefore.count

            await dequeueFillsSuccess(
                program,
                maxSolAmount,
                userKeyPair,
                expectedTokenDequeued,
                expectedFillsConsumed
            )
            const fillsRegistryAfter: FillsRegistry = await getFillsRegistryAccount(program);
            assert.equal(fillsRegistryAfter.totalSolPending, 0)
        });

        it("User gets error when doing dequeue from empty fills registry", async () => {
            await dequeueFillsFail(
                program,
                DEFAULT_CONFIGS.solQuantity,
                userKeyPair,
                "Trying To Dequeue From Empty Fills Registry"
            )
        });

        it("User dequeues 1  fill", async () => {
            const bidFactor = 1.1;
            const askPrice = await buySolSuccess(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                userKeyPair,
                currentConfigs,
                bidFactor
            );

            maxSolAmount = Number(DEFAULT_CONFIGS.solQuantity);
            expectedTokenDequeued =  Math.floor(askPrice * bidFactor) * maxSolAmount / LAMPORTS_PER_SOL;
            expectedFillsConsumed = 1

            await dequeueFillsSuccess(
                program,
                maxSolAmount,
                userKeyPair,
                expectedTokenDequeued,
                expectedFillsConsumed
            )
        });

        it("User dequeues 6 fills", async () => {
            const bidFactor = 1.12;
            const numOfBuySols = 6;
            const askPrices: number[] = [];
            for (let i = 0; i < numOfBuySols; i++) {
                askPrices.push(
                    await buySolSuccess(
                        program,
                        mockTransferProgram,
                        tokenAccountForUser,
                        userKeyPair,
                        currentConfigs,
                        bidFactor
                    )
                );
            }

            maxSolAmount = numOfBuySols * Number(DEFAULT_CONFIGS.solQuantity);
            expectedTokenDequeued = askPrices.reduce((sum: number, askPrice: number): number => {
                const adjustedPrice = Math.floor(askPrice * bidFactor);
                const solAmount = Number(DEFAULT_CONFIGS.solQuantity) * adjustedPrice / LAMPORTS_PER_SOL;
                return sum + solAmount;
            }, 0);
            expectedFillsConsumed = numOfBuySols

            await dequeueFillsSuccess(
                program,
                maxSolAmount,
                userKeyPair,
                expectedTokenDequeued,
                expectedFillsConsumed
            );
        });

        it("Partial Dequeue Fills", async () => {
            const BID_FACTOR = 2.12;
            // planning to dequeue PARTIAL_DEQUEUE_MULTIPLIER fills
            const PARTIAL_DEQUEUE_MULTIPLIER = 3.321;
            const askPrices: number[] = [];
            for (let i = 0; i < 5; i++) {
                askPrices.push(
                    await buySolSuccess(
                        program,
                        mockTransferProgram,
                        tokenAccountForUser,
                        userKeyPair,
                        currentConfigs,
                        BID_FACTOR
                    )
                );
            }

            maxSolAmount = Math.floor(PARTIAL_DEQUEUE_MULTIPLIER * Number(DEFAULT_CONFIGS.solQuantity));
            const solQuantity = Number(DEFAULT_CONFIGS.solQuantity);

            expectedTokenDequeued =
                Math.floor(askPrices[0] * BID_FACTOR) * solQuantity / LAMPORTS_PER_SOL +
                Math.floor(askPrices[1] * BID_FACTOR) * solQuantity / LAMPORTS_PER_SOL +
                Math.floor(askPrices[2] * BID_FACTOR) * solQuantity / LAMPORTS_PER_SOL +
                (maxSolAmount - Math.floor(PARTIAL_DEQUEUE_MULTIPLIER) * solQuantity) * Math.floor(askPrices[3] * BID_FACTOR) / LAMPORTS_PER_SOL;
            expectedFillsConsumed = Math.ceil(PARTIAL_DEQUEUE_MULTIPLIER);

            await dequeueFillsSuccess(
                program,
                maxSolAmount,
                userKeyPair,
                Math.floor(expectedTokenDequeued),
                expectedFillsConsumed
            );
        });
    });
});
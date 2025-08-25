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
import {clearUpFillsRegistry, consumeFillsFail, consumeFillsSuccess} from "./core/test-flow/dequeue-fills-flow";
import {setFillsConsumerAndVerify} from "./core/test-flow/set-fills-consumer";

describe("Consume fills tests", () => {
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
    let expectedTokenConsumed: number;
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

    describe("Authorization check", async() => {
        it("Rejects fill consumption by unauthorized user", async () => {
            await buySolSuccess(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                userKeyPair,
                currentConfigs,
                1
            );

            await consumeFillsFail(
                program,
                DEFAULT_CONFIGS.solQuantity,
                userKeyPair,
                "User is not authorized to do fills consumption"
            );
        });

        it("User is set as fills consumer", async () => {
            await setFillsConsumerAndVerify(
                program,
                getDefaultKeyPair(),
                userKeyPair.publicKey,
            )
        });

        it("Clear up the fills registry", async ()=> {
            await clearUpFillsRegistry(program, userKeyPair);
        });

        it("Authorized user should consume the fills", async () => {
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
            expectedTokenConsumed =  Math.floor(askPrice * bidFactor) * maxSolAmount / LAMPORTS_PER_SOL;
            expectedFillsConsumed = 1

            await consumeFillsSuccess(
                program,
                maxSolAmount,
                userKeyPair,
                expectedTokenConsumed,
                expectedFillsConsumed,
                1,
                0,
                1
            );
        });

        after("Clear up fills registry", async () => {
            await clearUpFillsRegistry(program, userKeyPair);
        });
    });

    describe("Emptying fills registry and attempts to consume from it", async () => {
        it("Clear up fills registry", async () => {
            const bidFactor = 1.1;
            await buySolSuccess(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                userKeyPair,
                currentConfigs,
                bidFactor
            );

            await clearUpFillsRegistry(program, userKeyPair);
        });

        it("Fails consume operation if fills registry is empty.", async () => {
            await consumeFillsFail(
                program,
                DEFAULT_CONFIGS.solQuantity,
                userKeyPair,
                "Fills registry is empty — cannot consume"
            )
        });

        after("Clear up fills registry", async () => {
            await clearUpFillsRegistry(program, userKeyPair);
        });
    });

    describe("Edge cases", async () => {
        it("Fails when max_sol_amount is zero", async () => {
            await consumeFillsFail(
                program,
                new anchor.BN(0),
                userKeyPair,
                "Provided SOL amount for consumption is invalid"
            );
        });

        it("Consumes less than SOL quantity", async () => {
            await clearUpFillsRegistry(program, userKeyPair);
            const bidFactor = 1.1;
            const askPrice = await buySolSuccess(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                userKeyPair,
                currentConfigs,
                bidFactor
            );
            maxSolAmount = Number(DEFAULT_CONFIGS.solQuantity) - 3 * LAMPORTS_PER_SOL;
            expectedTokenConsumed =  Math.floor(askPrice * bidFactor) * maxSolAmount / LAMPORTS_PER_SOL;
            expectedFillsConsumed = 1

            await consumeFillsSuccess(
                program,
                maxSolAmount,
                userKeyPair,
                expectedTokenConsumed,
                expectedFillsConsumed,
                1,
                1,
                0
            );
        });

        after("Clear up fills registry", async () => {
            await clearUpFillsRegistry(program, userKeyPair);
        });
    });


    describe("Batch fills consumption", async() => {
        it("Should successfully consume 6 fills in single attempt", async () => {
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
            expectedTokenConsumed = askPrices.reduce((sum: number, askPrice: number): number => {
                const adjustedPrice = Math.floor(askPrice * bidFactor);
                const solAmount = Number(DEFAULT_CONFIGS.solQuantity) * adjustedPrice / LAMPORTS_PER_SOL;
                return sum + solAmount;
            }, 0);
            expectedFillsConsumed = numOfBuySols

            await consumeFillsSuccess(
                program,
                maxSolAmount,
                userKeyPair,
                expectedTokenConsumed,
                expectedFillsConsumed,
                numOfBuySols,
                0,
                expectedFillsConsumed
            );
        });

        after("Clear up fills registry", async () => {
            await clearUpFillsRegistry(program, userKeyPair);
        });
    });

    describe("Partial fills consumption", async() => {
        it("Partial consume fills", async () => {
            const bidFactor = 2.12;
            const numOfBuySols = 5;
            // planning to consume PARTIAL_CONSUMPTION_MULTIPLIER fills
            const PARTIAL_CONSUMPTION_MULTIPLIER = 3.321;
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
            maxSolAmount = Math.floor(PARTIAL_CONSUMPTION_MULTIPLIER * Number(DEFAULT_CONFIGS.solQuantity));
            const solQuantity = Number(DEFAULT_CONFIGS.solQuantity);

            expectedTokenConsumed =
                Math.floor(askPrices[0] * bidFactor) * solQuantity / LAMPORTS_PER_SOL +
                Math.floor(askPrices[1] * bidFactor) * solQuantity / LAMPORTS_PER_SOL +
                Math.floor(askPrices[2] * bidFactor) * solQuantity / LAMPORTS_PER_SOL +
                (maxSolAmount - Math.floor(PARTIAL_CONSUMPTION_MULTIPLIER) * solQuantity) * Math.floor(askPrices[3] * bidFactor) / LAMPORTS_PER_SOL;
            expectedFillsConsumed = Math.ceil(PARTIAL_CONSUMPTION_MULTIPLIER);
            const finalCount = numOfBuySols - Math.floor(PARTIAL_CONSUMPTION_MULTIPLIER);

            await consumeFillsSuccess(
                program,
                maxSolAmount,
                userKeyPair,
                Math.floor(expectedTokenConsumed),
                expectedFillsConsumed,
                numOfBuySols,
                finalCount,
                Math.floor(PARTIAL_CONSUMPTION_MULTIPLIER)
            );
        });

        after("Clear up fills registry", async () => {
            await clearUpFillsRegistry(program, userKeyPair);
        });
    });
});
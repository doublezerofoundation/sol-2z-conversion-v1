import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {MockTransferProgram} from "../../mock-double-zero-program/target/types/mock_transfer_program";
import mockTransferProgramIdl from "../../mock-double-zero-program/target/idl/mock_transfer_program.json";
import {airdrop, getDefaultKeyPair} from "./core/utils/accounts";
import {initializeMockTransferSystemIfNeeded, mint2z} from "./core/test-flow/mock-transfer-program";
import {createTokenAccount} from "./core/utils/token-utils";
import {getMockProgramPDAs} from "./core/utils/pda-helper";
import {Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction} from "@solana/web3.js";
import {buySolAndVerify, buySolFail, buySolSuccess, prepareBuySolInstruction} from "./core/test-flow/buy-sol-flow";
import {ConverterProgram} from "../target/types/converter_program";
import {initializeSystemIfNeeded} from "./core/test-flow/system-initialize";
import {DEFAULT_CONFIGS, SystemConfig} from "./core/utils/configuration-registry";
import {updateConfigsAndVerify} from "./core/test-flow/change-configs";
import {getConversionPriceAndVerify} from "./core/test-flow/conversion-price";
import {getOraclePriceData} from "./core/utils/price-oracle";
import {BPS, TOKEN_DECIMAL} from "./core/constants";
import {airdropVault} from "./core/utils/mock-transfer-program-utils";
import {addToDenyListAndVerify, removeFromDenyListAndVerify, setDenyListAuthorityAndVerify} from "./core/test-flow/deny-list";
import {toggleSystemStateAndVerify} from "./core/test-flow/system-state";
import {assert, expect} from "chai";

describe("Buy Sol Tests", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.converterProgram as Program<ConverterProgram>;
    const mockTransferProgram: Program<MockTransferProgram> = new Program(mockTransferProgramIdl as anchor.Idl, anchor.getProvider());
    let adminKeyPair: Keypair = getDefaultKeyPair();
    let mockTransferProgramPDAs;
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


    describe("Happy Path", async() => {
        it("User does buySOL at higher price than Ask Price", async () => {
            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData, userKeyPair);
            const bidPrice = askPrice + 2 * TOKEN_DECIMAL;

            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity)

            await buySolAndVerify(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData
            );
        });

        it("should fail to do buy sol for price less than ask price", async () => {
            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData, userKeyPair);
            const bidPrice = askPrice - 100000;
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                "Provided bid is too low"
            );
        });
    });

    describe("Edge cases", async() => {
        it("User does buySOL at same price as Ask Price", async () => {
            const oraclePriceData = await getOraclePriceData();
            const bidPrice = await getConversionPriceAndVerify(program, oraclePriceData, userKeyPair);
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity)

            await buySolAndVerify(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData
            );
        });

        it("should fail to do buy sol for price slightly less than ask price", async () => {

            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData, userKeyPair);
            const bidPrice = askPrice - 1000;
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                "Provided bid is too low"
            );
        });


        it("User does buySOL at same price as Oracle Price", async () => {
            const oraclePriceData = await getOraclePriceData();
            const bidPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity)

            await buySolAndVerify(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData
            );
        });

    });

    describe("Insufficient Balance", async() => {
        it("User does buySOL without having enough 2Z balance should fail", async () => {
            const oraclePriceData = await getOraclePriceData();
            const bidPrice = Number(oraclePriceData.swapRate);

            // create key pair & token account for user
            const tempUserKeyPair = anchor.web3.Keypair.generate();
            await airdrop(
                mockTransferProgram.provider.connection,
                tempUserKeyPair.publicKey,
                10 * LAMPORTS_PER_SOL
            );
            const tokenAccountForTempUser = await createTokenAccount(
                mockTransferProgram.provider.connection,
                mockTransferProgramPDAs.tokenMint,
                tempUserKeyPair.publicKey,
            );

            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForTempUser,
                bidPrice,
                tempUserKeyPair,
                oraclePriceData,
                "insufficient funds"
            );
        });
    });


    describe("DenyList Tests", async () => {
        it("should fail to do buy sol for deny listed user", async () => {
            // Add user to deny list
            await addToDenyListAndVerify(program, userKeyPair.publicKey);

            const oraclePriceData = await getOraclePriceData();
            const bidPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                "User is blocked in the DenyList"
            );
        });

        it("User should be able to do buy SOL after removed from to denylist", async () => {
            await removeFromDenyListAndVerify(program, userKeyPair.publicKey);
            await buySolSuccess(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                userKeyPair,
            );
        });
    });

    describe("Market Halting Check", async () => {
        it("should fail to do buy sol during market halt", async () => {
            // Make system to halt stage
            await toggleSystemStateAndVerify(program, true);

            const oraclePriceData = await getOraclePriceData();
            const bidPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                "System is halted"
            );
        });

        it("User should be able to do buy SOL after market gets Opened", async () => {
            await toggleSystemStateAndVerify(program, false);

            await buySolSuccess(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                userKeyPair,
            );
        });
    });

    describe("Checking Single Trade Per Slot", async () => {
        it("A user attempts to two buy sol instruction, should fail", async () => {
            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData);
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity);

            try {
                const buySol1: TransactionInstruction = await prepareBuySolInstruction(
                    program,
                    mockTransferProgram,
                    tokenAccountForUser,
                    askPrice,
                    userKeyPair,
                    oraclePriceData
                );
                const buySol2: TransactionInstruction = await prepareBuySolInstruction(
                    program,
                    mockTransferProgram,
                    tokenAccountForUser,
                    askPrice * 5,
                    userKeyPair,
                    oraclePriceData
                );
                const tx: Transaction = new anchor.web3.Transaction().add(buySol1, buySol2);
                await program.provider.sendAndConfirm(tx, [userKeyPair]);
            } catch (error) {
                // First transaction success message should be verified
                // Second Transaction failure message should be verified
                const firstExecutionLogs = "Buy SOL is successful";
                const expectedError = "Only one trade is allowed per slot";
                const errorMessage = (new Error(error!.toString())).message;
                expect(errorMessage).to.include(firstExecutionLogs);
                expect(errorMessage).to.include(expectedError);
                assert.ok(true, "Buy SOL is rejected as expected");
                return; // Exit early — test passes
            }
            assert.fail("It was able to do two buy SOL in single slot");
        });

        it("Two different users attempt to two buy sol instruction, should fail", async () => {
            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData);
            const tempUserKeyPair = anchor.web3.Keypair.generate();
            const tokenAccountForTempUser = await createTokenAccount(
                mockTransferProgram.provider.connection,
                mockTransferProgramPDAs.tokenMint,
                tempUserKeyPair.publicKey,
            );

            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );

            await mint2z(
                mockTransferProgram,
                tokenAccountForTempUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity);

            try {
                const buySol1: TransactionInstruction = await prepareBuySolInstruction(
                    program,
                    mockTransferProgram,
                    tokenAccountForUser,
                    askPrice,
                    userKeyPair,
                    oraclePriceData
                );
                const buySol2: TransactionInstruction = await prepareBuySolInstruction(
                    program,
                    mockTransferProgram,
                    tokenAccountForTempUser,
                    askPrice * 5,
                    tempUserKeyPair,
                    oraclePriceData
                );
                const tx: Transaction = new anchor.web3.Transaction().add(buySol1, buySol2);
                await program.provider.sendAndConfirm(tx, [userKeyPair, tempUserKeyPair]);
            } catch (error) {
                // First transaction success message should be verified
                // Second Transaction failure message should be verified
                const firstExecutionLogs = "Buy SOL is successful";
                const expectedError = "Only one trade is allowed per slot";
                const errorMessage = (new Error(error!.toString())).message;
                expect(errorMessage).to.include(firstExecutionLogs);
                expect(errorMessage).to.include(expectedError);
                expect(errorMessage.indexOf("Buy SOL is successful")).to.be
                    .lessThan(errorMessage.indexOf("Only one trade is allowed per slot"),
                        "Success must come before error");
                assert.ok(true, "Buy SOL is rejected as expected");
                return; // Exit early — test passes
            }
            assert.fail("It was able to do two buy SOL in single slot");
        });

    });


    describe("Config Change Check", async () => {

        it("User should be able to do buy SOL with proper rates", async () => {
            currentConfigs = {
                ...DEFAULT_CONFIGS,
                solQuantity: new anchor.BN(24 * LAMPORTS_PER_SOL),
                maxDiscountRate: new anchor.BN(55 * BPS),
            };
            await updateConfigsAndVerify(
                program,
                currentConfigs
            );

            const oraclePriceData = await getOraclePriceData();
            const bidPrice = await getConversionPriceAndVerify(program, oraclePriceData, userKeyPair) + 10000;
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity)

            await buySolAndVerify(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                currentConfigs
            );
        });
    });

    describe("Invalid Attestation Check", async () => {
        it("should fail to do buy sol with invalid signature", async () => {
            // changing to default config
            await updateConfigsAndVerify(
                program,
                DEFAULT_CONFIGS
            );
            currentConfigs = DEFAULT_CONFIGS;

            let oraclePriceData = await getOraclePriceData();

            // manually making changes
            oraclePriceData = {
                ...oraclePriceData,
                swapRate: 122131,
            };

            const bidPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure vault has funds.
            await airdropVault(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                "Provided Attestation is not Authentic"
            );
        });
    });
});
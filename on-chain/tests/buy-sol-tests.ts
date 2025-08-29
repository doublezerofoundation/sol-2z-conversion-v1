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
import {getOraclePriceData, getOraclePriceDataFor} from "./core/utils/price-oracle";
import {BPS, ErrorMsg, Events, TOKEN_UNITS} from "./core/constants";
import {airdropJournal} from "./core/utils/mock-transfer-program-utils";
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
        // Initializing the Mock Transfer system If not already initialized.
        await initializeMockTransferSystemIfNeeded(
            mockTransferProgram,
            adminKeyPair,
        )
        // Set deny list authority to admin.
        await setDenyListAuthorityAndVerify(program, adminKeyPair.publicKey);

        // Update configurations to Default Configuration
        await updateConfigsAndVerify(
            program,
            DEFAULT_CONFIGS
        );

        currentConfigs = DEFAULT_CONFIGS;
        mockTransferProgramPDAs = getMockProgramPDAs(mockTransferProgram.programId);

        // create key pair & token account for user.
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

    after("Change configs to default", async () => {
        await updateConfigsAndVerify(
            program,
            DEFAULT_CONFIGS
        );
    });

    describe("Happy path", async() => {
        it("User does buy SOL at higher price than ask price", async () => {
            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData, userKeyPair);
            const bidPrice = askPrice + 2 * TOKEN_UNITS;

            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolAndVerify(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData
            );
        });

        it("Should fail to execute buy SOL if the bid price is lower than the ask Price.", async () => {
            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData, userKeyPair);
            const bidPrice = askPrice - 100000;
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                ErrorMsg.BID_TOO_LOW,
                Events.BID_TOO_LOW
            );
        });
    });

    describe("Price data verification", async () => {
        it("Should fail to execute a buy SOL operation with stale oracle data", async () => {
            const delay = Number(DEFAULT_CONFIGS.priceMaximumAge) + 1;
            const oraclePriceData = await getOraclePriceDataFor(20, Math.floor(Date.now() / 1000) - delay);

            const bidPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                ErrorMsg.STALE_PRICE
            );
        });

        it("Fails buy SOL execution when attestation is invalid (swap rate is altered)", async () => {
            let oraclePriceData = await getOraclePriceData();

            // manually making changes
            oraclePriceData = {
                ...oraclePriceData,
                swapRate: 122131,
            };

            const askPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                askPrice,
                userKeyPair,
                oraclePriceData,
                ErrorMsg.ATTESTATION_NOT_AUTHENTIC
            );
        });

        it("Fails buy SOL execution when signature is invalid", async () => {
            let oraclePriceData = await getOraclePriceData();
            oraclePriceData.signature = "invalid_signature";

            const askPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                askPrice,
                userKeyPair,
                oraclePriceData,
                ErrorMsg.ATTESTATION_INVALID
            );
        });

        it("Fails buy SOL execution when signature is empty", async () => {
            let oraclePriceData = await getOraclePriceData();
            oraclePriceData.signature = "";

            const askPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                askPrice,
                userKeyPair,
                oraclePriceData,
                ErrorMsg.ATTESTATION_NOT_AUTHENTIC
            );
        });
    });

    describe("Edge cases", async() => {
        it("User successfully buys SOL at the current ask price.", async () => {
            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData, userKeyPair);
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolAndVerify(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                askPrice,
                userKeyPair,
                oraclePriceData
            );
        });

        it("Fails to buy SOL when the bid price is slightly less than ask price", async () => {
            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData, userKeyPair);
            const bidPrice = askPrice - 1000;

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                ErrorMsg.BID_TOO_LOW,
                Events.BID_TOO_LOW
            );
        });

        it("Executes buy SOL successfully at minimum discounted price.", async () => {
            const oraclePriceData = await getOraclePriceData();
            const minDiscountRate = DEFAULT_CONFIGS.minDiscountRate.toNumber() / (100 * BPS);
            assert(minDiscountRate >= 0, "Minimum discount rate should be greater than or equal to 0");
            assert(minDiscountRate <= 1, "Minimum discount rate should be less than or equal to 1");
            const bidPrice = Math.ceil(oraclePriceData.swapRate * (1 - minDiscountRate));
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                oraclePriceData.swapRate * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolAndVerify(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData
            );
        });

        it("Fails buy SOL when bid < Max Discounted Price", async () => {
            const oraclePriceData = await getOraclePriceData();
            const maxDiscountRate = DEFAULT_CONFIGS.maxDiscountRate.toNumber() / (100 * BPS);
            assert(maxDiscountRate >= 0, "Minimum discount rate should be greater than or equal to 0");
            assert(maxDiscountRate <= 1, "Minimum discount rate should be less than or equal to 1");
            const bidPrice = Math.floor(oraclePriceData.swapRate * (1 - maxDiscountRate)) - 1;

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                ErrorMsg.BID_TOO_LOW,
                Events.BID_TOO_LOW
            );
        });

        it("Fails to buy SOL when the bid price is zero", async () => {
            const oraclePriceData = await getOraclePriceData();
            const bidPrice = 0;

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                ErrorMsg.BID_TOO_LOW,
                Events.BID_TOO_LOW
            );
        });

        it("Fails to buy SOL when the bid price is negative", async () => {
            const oraclePriceData = await getOraclePriceData();
            const bidPrice = -4;

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice,
                userKeyPair,
                oraclePriceData,
                ErrorMsg.BID_TOO_LOW,
                Events.BID_TOO_LOW
            );
        });

        it("User does buy SOL at same price as oracle Price", async () => {
            const oraclePriceData = await getOraclePriceData();
            const bidPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

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

    describe("Insufficient balance", async() => {
        it("User does buy SOL without having enough 2Z balance should fail", async () => {
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

            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForTempUser,
                bidPrice,
                tempUserKeyPair,
                oraclePriceData,
                ErrorMsg.INSUFFICIENT_FUNDS,
            );
        });
    });

    describe("Deny list tests", async () => {
        it("Should fail to do buy sol for deny listed user", async () => {
            // Ad user to deny list
            await addToDenyListAndVerify(program, userKeyPair.publicKey);

            const oraclePriceData = await getOraclePriceData();
            const askPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                askPrice,
                userKeyPair,
                oraclePriceData,
                ErrorMsg.ACCESS_BY_DENIED_PERSON
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

    describe("Market halting check", async () => {
        it("should fail to do buy sol during market halt", async () => {
            // Make system to halt stage
            await toggleSystemStateAndVerify(program, true);

            const oraclePriceData = await getOraclePriceData();
            const askPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolFail(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                askPrice,
                userKeyPair,
                oraclePriceData,
                ErrorMsg.SYSTEM_HALTED
            );
        });

        it("User should be able to do buy SOL after market gets opened", async () => {
            await toggleSystemStateAndVerify(program, false);

            await buySolSuccess(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                userKeyPair,
            );
        });
    });

    describe("Checking single trade per slot", async () => {
        it("A user attempting to buy sol twice in the same slot, should fail", async () => {
            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData);
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity);

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
                // First transaction success message should be verified.
                // Second Transaction failure message should be verified.
                const firstExecutionLogs = "Buy SOL is successful";
                const expectedError = "Only one trade is allowed per slot";
                const errorMessage = (new Error(error!.toString())).message;
                expect(errorMessage).to.include(firstExecutionLogs);
                expect(errorMessage).to.include(expectedError);
                assert.ok(true, "Buy SOL is rejected as expected");
                return; // Exit early — test passes.
            }
            assert.fail("It was able to do two buy SOL in single slot");
        });

        it("Two different users attempting to buy sol in the same slot, should fail", async () => {
            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData);
            const tempUserKeyPair = anchor.web3.Keypair.generate();
            const tokenAccountForTempUser = await createTokenAccount(
                mockTransferProgram.provider.connection,
                mockTransferProgramPDAs.tokenMint,
                tempUserKeyPair.publicKey,
            );

            // Ensure that user has sufficient 2Z.
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
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity);

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
                // First transaction success message should be verified.
                // Second Transaction failure message should be verified.
                const firstExecutionLogs = "Buy SOL is successful";
                const expectedError = "Only one trade is allowed per slot";
                const errorMessage = (new Error(error!.toString())).message;
                expect(errorMessage).to.include(firstExecutionLogs);
                expect(errorMessage).to.include(expectedError);
                expect(errorMessage.indexOf("Buy SOL is successful")).to.be
                    .lessThan(errorMessage.indexOf("Only one trade is allowed per slot"),
                        "Success must come before error");
                assert.ok(true, "Buy SOL is rejected as expected");
                return; // Exit early — test passes.
            }
            assert.fail("It was able to do two buy SOL in single slot");
        });

    });

    describe("Config change check", async () => {

        it("User should be able to do buy SOL with proper rates", async () => {
            currentConfigs = {
                ...DEFAULT_CONFIGS,
                solQuantity: new anchor.BN(24 * LAMPORTS_PER_SOL),
            };
            await updateConfigsAndVerify(
                program,
                currentConfigs
            );

            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, oraclePriceData, userKeyPair) + 10000;
            // Ensure that user has sufficient 2Z.
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                askPrice * Number(currentConfigs.solQuantity) / LAMPORTS_PER_SOL
            );
            // Ensure journal has funds.
            await airdropJournal(mockTransferProgram, currentConfigs.solQuantity)

            await buySolAndVerify(
                program,
                mockTransferProgram,
                tokenAccountForUser,
                askPrice,
                userKeyPair,
                oraclePriceData,
                currentConfigs
            );
        });

        after("Changing to default configs", async () => {
            // changing to default config.
            await updateConfigsAndVerify(
                program,
                DEFAULT_CONFIGS
            );
            currentConfigs = DEFAULT_CONFIGS;
        });
    });
});
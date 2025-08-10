import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {MockTransferProgram} from "../../mock-double-zero-program/target/types/mock_transfer_program";
import {airdrop, getDefaultKeyPair} from "./core/utils/accounts";
import {initializeMockTransferSystemIfNeeded, mint2z} from "./core/test-flow/mock-transfer-program";
import {createTokenAccount} from "./core/utils/token-utils";
import {getMockProgramPDAs} from "./core/utils/pda-helper";
import {Keypair, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {buySolAndVerify, buySolFail} from "./core/test-flow/buy-sol-flow";
import {ConverterProgram} from "../target/types/converter_program";
import {initializeSystemIfNeeded} from "./core/test-flow/system-initialize";
import {DEFAULT_CONFIGS, SystemConfig} from "./core/utils/configuration-registry";
import {updateConfigsAndVerify} from "./core/test-flow/change-configs";
import {getConversionPriceAndVerify} from "./core/test-flow/conversion-price";
import {getOraclePriceData} from "./core/utils/price-oracle";
import {TOKEN_DECIMAL} from "./core/constants";
import {airdropVault} from "./core/utils/mock-transfer-program-utils";
import {addToDenyListAndVerify, removeFromDenyListAndVerify} from "./core/test-flow/deny-list";
import {toggleSystemStateAndVerify} from "./core/test-flow/system-state";

describe("Buy Sol Tests", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.converterProgram as Program<ConverterProgram>;
    const mockTransferProgram = anchor.workspace.mockTransferProgram as Program<MockTransferProgram>;
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

        // Update configurations to Default Configuration
        await updateConfigsAndVerify(
            program,
            adminKeyPair,
            DEFAULT_CONFIGS
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
            adminKeyPair,
            DEFAULT_CONFIGS
        );
    });


    describe("Happy Path", async() => {
        it("User does buySOL at higher price than Ask Price", async () => {
            const oraclePriceData = await getOraclePriceData();
            const askPrice = await getConversionPriceAndVerify(program, userKeyPair);
            const bidPrice = askPrice + 2 * TOKEN_DECIMAL;

            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity)
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
            const askPrice = await getConversionPriceAndVerify(program, userKeyPair);
            const bidPrice = askPrice - 1000;
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity)
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
            const bidPrice = await getConversionPriceAndVerify(program, userKeyPair);
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity)
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
            const askPrice = await getConversionPriceAndVerify(program, userKeyPair);
            const bidPrice = askPrice - 1;
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity)
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
                bidPrice * Number(currentConfigs.solQuantity)
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
                bidPrice * Number(currentConfigs.solQuantity)
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
            const oraclePriceData = await getOraclePriceData();
            const bidPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity)
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

    describe("Market Halting Check", async () => {
        it("should fail to do buy sol during market halt", async () => {
            // Make system to halt stage
            await toggleSystemStateAndVerify(program, adminKeyPair, true);

            const oraclePriceData = await getOraclePriceData();
            const bidPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity)
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
            await toggleSystemStateAndVerify(program, adminKeyPair, false);
            const oraclePriceData = await getOraclePriceData();
            const bidPrice = Number(oraclePriceData.swapRate);
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity)
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

    describe("Config Change Check", async () => {
        it("should fail to do buy sol after config change using inappropriate price", async () => {
            const oldAskPrice = await getConversionPriceAndVerify(program, userKeyPair);
            // decrease the discount rate
            currentConfigs = {
                ...DEFAULT_CONFIGS,
                solQuantity: new anchor.BN(21),
                maxDiscountRate: new anchor.BN(15),
            };
            await updateConfigsAndVerify(
                program,
                adminKeyPair,
                currentConfigs
            );

            const oraclePriceData = await getOraclePriceData();
            const bidPrice = oldAskPrice;
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity)
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

        it("User should be able to do buy SOL with proper rates", async () => {
            await updateConfigsAndVerify(
                program,
                adminKeyPair,
                DEFAULT_CONFIGS
            );
            const oraclePriceData = await getOraclePriceData();
            const bidPrice = await getConversionPriceAndVerify(program, userKeyPair);
            // Ensure that user has sufficient 2Z
            await mint2z(
                mockTransferProgram,
                tokenAccountForUser,
                bidPrice * Number(currentConfigs.solQuantity)
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

    describe("Invalid Attestation CHeck", async () => {
        it("should fail to do buy sol with invalid signature", async () => {
            // Make system to halt stage
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
                bidPrice * Number(currentConfigs.solQuantity)
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

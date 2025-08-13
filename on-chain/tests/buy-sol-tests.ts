import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {MockTransferProgram} from "../../mock-double-zero-program/target/types/mock_transfer_program";
import mockTransferProgramIdl from "../../mock-double-zero-program/target/idl/mock_transfer_program.json";
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
import {BPS, TOKEN_DECIMAL} from "./core/constants";
import {airdropVault} from "./core/utils/mock-transfer-program-utils";
import {addToDenyListAndVerify, removeFromDenyListAndVerify} from "./core/test-flow/deny-list";
import {toggleSystemStateAndVerify} from "./core/test-flow/system-state";

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
            const askPrice = await getConversionPriceAndVerify(program, userKeyPair);
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
            const askPrice = await getConversionPriceAndVerify(program, userKeyPair);
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
            const bidPrice = await getConversionPriceAndVerify(program, userKeyPair);
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
            const askPrice = await getConversionPriceAndVerify(program, userKeyPair);
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

    describe("Config Change Check", async () => {

        it("User should be able to do buy SOL with proper rates", async () => {
            currentConfigs = {
                ...DEFAULT_CONFIGS,
                solQuantity: new anchor.BN(24 * LAMPORTS_PER_SOL),
                maxDiscountRate: new anchor.BN(15 * BPS),
            };
            await updateConfigsAndVerify(
                program,
                currentConfigs
            );

            const oraclePriceData = await getOraclePriceData();
            const bidPrice = await getConversionPriceAndVerify(program, userKeyPair) + 3;
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
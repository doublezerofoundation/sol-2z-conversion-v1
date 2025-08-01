import { BN, Program } from "@coral-xyz/anchor";
import { ConverterProgram } from "../../../target/types/converter_program";
import { getConfigurationRegistryPDA, getDenyListRegistryPDA, getProgramStatePDA } from "../utils/pda-helper";
import { getDefaultKeyPair } from "../utils/accounts";
import { OraclePriceData } from "../utils/price-oracle";
import { assert } from "chai";
import { decodeAndValidateReturnData, ReturnData } from "../utils/return-data";

export const getConversionPriceAndVerify = async (program: Program<ConverterProgram>, oraclePriceData: OraclePriceData) => {
    const configurationRegistryPDA = await getConfigurationRegistryPDA(program.programId);
    const denyListRegistryPDA = await getDenyListRegistryPDA(program.programId);
    const programStatePDA = await getProgramStatePDA(program.programId);

    const signer = getDefaultKeyPair();

    const configurationRegistry = await program.account.configurationRegistry.fetch(configurationRegistryPDA);
    const denyListRegistry = await program.account.denyListRegistry.fetch(denyListRegistryPDA);
    const programState = await program.account.programStateAccount.fetch(programStatePDA);

    // const expectedAskPrice = configurationRegistry.solQuantity.mul()

    const signature = await program.methods.calculateAskPrice({
        swapRate: oraclePriceData.swapRate,
        timestamp: new BN(oraclePriceData.timestamp),
        signature: oraclePriceData.signature,
    }).accounts({
        signer: signer.publicKey,
    }).rpc();

    // Retry 5 times
    for (let i = 0; i < 5; i++) {
        // Wait for 1 second
        setTimeout(() => {}, 2000);

        const transaction: any = await program.provider.connection.getTransaction(signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 1,
        });

        if (!transaction || !transaction.meta || !transaction.meta.returnData) {
            if (i === 4) {
                assert.fail("Transaction not found");
            }
            continue;
        }

        const returnData = transaction.meta.returnData as ReturnData;

        try {
            const decodedReturnData = decodeAndValidateReturnData(returnData, program.programId.toString());
            // Convert the decoded u8 array (little-endian) into a u64 integer
            // Uint8Array does not have readBigUInt64LE, so use DataView
            if (decodedReturnData.length < 8) {
                assert.fail("Decoded return data is too short to contain a u64 value");
            }
            const dataView = new DataView(decodedReturnData.buffer, decodedReturnData.byteOffset, decodedReturnData.byteLength);
            const askPrice = dataView.getBigUint64(0, true); // true for little-endian

            console.log("Ask price: ", askPrice);
        } catch (error) {
            assert.fail("Error decoding return data", error);
        }

        break;
    }
}
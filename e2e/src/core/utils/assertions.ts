import { BorshCoder } from "@coral-xyz/anchor/dist/cjs/coder/borsh";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "../../../../on-chain/target/idl/converter_program.json";
import { Idl } from "@coral-xyz/anchor";

export const accountExists = async (connection: Connection, publicKey: PublicKey): Promise<boolean> => {
    try {
        const account = await connection.getAccountInfo(publicKey);
        return account !== null;
    } catch (error) {
        return false;
    }
};

export const eventExists = async (connection: Connection, txSignature: string, eventName: string): Promise<boolean> => {
    const tx = await connection.getTransaction(txSignature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
    });
    if (!tx) {
        throw new Error(`Transaction ${txSignature} does not exist`);
    }
    const logs = tx.meta?.logMessages;
    if (!logs) {
        throw new Error(`Transaction ${txSignature} has no logs`);
    }
    const coder = new BorshCoder(idl as Idl);

    for (const log of logs) {
        if (log.startsWith("Program data: ")) {
            const base64Data = log.replace("Program data: ", "");
            try {
                const event = coder.events.decode(base64Data);
                // console.log(event);
                if (event?.name === eventName) {
                    return true;
                }
            } catch (_) {
                // not an event log, skip
            }
        }
    }
    return false;
}
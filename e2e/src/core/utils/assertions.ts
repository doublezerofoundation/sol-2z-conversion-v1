import { Connection, PublicKey } from "@solana/web3.js";

export const accountExists = async (connection: Connection, publicKey: PublicKey): Promise<boolean> => {
    try {
        const account = await connection.getAccountInfo(publicKey);
        return account !== null;
    } catch (error) {
        return false;
    }
};

export const eventExists = async (connection: Connection, txSignature: string, event: string): Promise<boolean> => {
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
    const eventLog = logs.find((log) => log.includes(event));
    if (!eventLog) {
        return false;
    }
    return true;
}
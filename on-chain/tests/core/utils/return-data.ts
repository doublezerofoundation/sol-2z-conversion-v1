import {BorshCoder} from "@coral-xyz/anchor";
import {Buffer} from "buffer";

export interface ReturnData {
    data: Array<string>[2],
    programId: string,
}

export const decodeAndValidateReturnData = (returnData: ReturnData, programId: string): Uint8Array => {
    // Example: returnData.data = [ 'aNwjAQAAAAA=', 'base64' ]
    // The first element is the base64-encoded data, the second is the encoding type
    const [base64String, encoding] = returnData.data;

    if (encoding !== "base64") {
        throw new Error(`Unsupported encoding: ${encoding}`);
    }
    if (returnData.programId !== programId) {
        throw new Error(`Program ID mismatch: ${returnData.programId} !== ${programId}`);
    }

    return Buffer.from(base64String, "base64");
};

export const getUint64FromBuffer = (buffer: Uint8Array, byteOffset = 0) => {
    const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    return dataView.getBigUint64(byteOffset, true); // true for little-endian
};

/**
 * Helper: parse event logs from transaction metadata
 */
export async function getTransactionLogs(provider, txSig: string) {
    const tx = await provider.connection.getTransaction(txSig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
    });
    return tx?.meta?.logMessages || [];
}

export function findAnchorEventInLogs(logs: string[], idl: any, eventName: string): any | null {
    const programDataLogs = logs.filter((line) => line.startsWith("Program data:"));
    const coder = new BorshCoder(idl);
    for (const log of programDataLogs) {
        const base64Data = log.split("Program data: ")[1];
        const buffer = Buffer.from(base64Data, "base64");
        try {
            const event = coder.events.decode(buffer as any);
            if (event && event.name === eventName) {
                return event;
            }
        } catch (err) {
            // Not an event or decode failed
        }
    }
    return null;
}

export async function delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
}
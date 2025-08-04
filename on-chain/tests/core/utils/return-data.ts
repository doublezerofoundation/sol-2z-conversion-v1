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

export const getUint64FromBuffer = (buffer: Uint8Array) => {
    const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    return dataView.getBigUint64(0, true); // true for little-endian
};
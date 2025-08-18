export const getTestName = (prefix: string, i: number, description: string) => {
    return `▶️  ${prefix}-${i}: ${description}`;
}

export const extractTxHashFromResult = (result: string) => {
    const regex = /Signature:\s([A-Za-z0-9]+)/m;
    const match = regex.exec(result);
    if (match) {
        return match[1];
    }
    throw new Error("Transaction hash not found in result");
}
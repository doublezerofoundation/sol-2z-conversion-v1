export const getTestName = (prefix: string, i: number, description: string) => {
    return `▶️  ${prefix}-${i}: ${description}`;
}

export const extractTxHashFromResult = (result: string) => {
    const regex = "Signature:\s(\w*)";
    const match = result.match(regex);
    if (match) {
        return match[1];
    }
    throw new Error("Transaction hash not found in result");
}
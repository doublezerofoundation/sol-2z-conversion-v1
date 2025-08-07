import { Test } from "../account-defs";

export const getTestName = (prefix: string, i: number, description: string) => {
    return `▶️  ${prefix}-${i}: ${description}`;
}
import { PRICE_ORACLE_END_POINT } from "../constants";

export interface OraclePriceData {
    swapRate: number;
    timestamp: number;
    signature: string;
    // solPriceUsd?: string;
    // twozPriceUsd?: string;
}

export const getOraclePriceData = async (): Promise<OraclePriceData> => {
    const response = await fetch(PRICE_ORACLE_END_POINT, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch price oracle data: ${response.statusText}`);
    }
    const data = await response.json() as OraclePriceData;
    return data;
}
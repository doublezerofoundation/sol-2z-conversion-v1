import {getConfig} from "./config-util";

export interface OraclePriceData {
    swapRate: number;
    timestamp: number;
    signature: string;
    // solPriceUsd?: string;
    // twozPriceUsd?: string;
}

export const getOraclePriceData = async (): Promise<OraclePriceData> => {
    const response = await fetch(getConfig().price_oracle_end_point, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch price oracle data: ${response.statusText}`);
    }
    return await response.json() as OraclePriceData;
}
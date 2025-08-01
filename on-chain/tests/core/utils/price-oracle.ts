
export interface OraclePriceData {
    swapRate: string;
    timestamp: number;
    signature: string;
    // solPriceUsd?: string;
    // twozPriceUsd?: string;
}

export const DEFAULT_ORACLE_PRICE_DATA: OraclePriceData = {
    swapRate: "19.1274",
    timestamp: 1754025551050,
    signature: "1234567890",
}
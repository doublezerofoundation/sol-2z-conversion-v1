export enum ConfigField {
    APPLICATION_PORT = 'applicationPort',
    PYTH_ENDPOINT = 'pythEndpoint',
    PRICE_FEED_ID = 'priceFeedIds',
    PRICING_SERVICE = 'pricingService',
    HREMES_ENDPOINT = 'hermesEndpoint',
    PRICING_SERVICE_TYPE = 'pricingServiceType'

}

export enum PriceFeed {
    BTC_USD = 'BTC/USD',
    SOL_USD = 'SOL/USD',
    TWOZ_USD = '2Z/USD'

}

export interface SwapRateResponce {
    swapRate: string;
    timestamp: string;
    signature: string;
    solPriceUsd: string;
    twozPriceUsd: string;
    cacheHit: boolean;
}

export enum PricingServiceType {
    PYTH = 'pyth',
    CHAINLINK = 'chainlink',
}
export enum ConfigField {
    APPLICATION_PORT = 'applicationPort',
    PYTH_ENDPOINT = 'pythEndpoint',
    PRICE_FEED_ID = 'priceFeedIds',
    PRICING_SERVICE = 'pricingService',
    HREMES_ENDPOINT = 'hermesEndpoint',
    PRICING_SERVICE_TYPE = 'pricingServiceType',
    PRICING_SERVICES = 'pricingServices'

}

export enum PriceFeed {
    BTC_USD = 'BTC/USD',
    SOL_USD = 'SOL/USD',
    TWOZ_USD = '2Z/USD'

}

export interface SwapRateResponce {
    swapRate: string;
    timestamp: string;
    signature: any;
    solPriceUsd: any;
    twozPriceUsd: any;
    cacheHit: boolean;
}

export enum PricingServiceType {
    PYTH = 'pyth',
    CHAINLINK = 'chainlink',
}

export interface PricingServicesConfig {
    name: string;
    type: PricingServiceType;
    endpoint: string;
    priceFeedIds: {
        "SOL/USD": string
        "BTC/USD": string
    }
}

export interface PriceRate {
    swapRate: number;
    solPriceUsd: number;
    twozPriceUsd: number;
    last_price_update: string;
}

export type HealthCheckResult = PythHealthCheckResponse

export interface PythHealthCheckResponse {
    serviceType: string;
    status: string;
    hermes_connected: boolean;
    last_price_update: string;
}

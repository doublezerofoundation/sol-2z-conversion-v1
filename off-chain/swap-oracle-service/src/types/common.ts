export enum ConfigField {
    APPLICATION_PORT = 'applicationPort',
    PYTH_ENDPOINT = 'pythEndpoint',
    PRICE_FEED_ID = 'priceFeedIds',
    PRICING_SERVICE = 'pricingService',
    HREMES_ENDPOINT = 'hermesEndpoint',
    PRICING_SERVICE_TYPE = 'pricingServiceType',
    PRICING_SERVICES = 'pricingServices',
    PRICE_CACHE_TTL_SECONDS = 'priceCacheTTLSeconds',
    LOG_LEVEL = 'logLevel',
    MAX_CONFIDENCE_RATIO = 'maxConfidenceRatio',
    MAX_PRICE_AGE_SECONDS = 'maxPriceAgeSeconds',


}
export const TWOZ_PRECISION = 100000000;
export const TWOZ_PRECISION_DECIMALS = 8;
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
    publishTime?: number;          // Effective publish time (min of both feeds, Unix seconds)
    solPublishTime?: number;       // SOL/USD feed publish_time
    twozPublishTime?: number;      // 2Z/USD feed publish_time
}

export type HealthCheckResult = PythHealthCheckResponse

export interface PythHealthCheckResponse {
    serviceType: string;
    status: HealthStatus;
    hermes_connected: boolean;
    cache_connected: boolean;
    last_price_update: string;
}

export enum HealthStatus {
    HEALTHY = 'HEALTHY',
    UN_HEALTHY = 'UN_HEALTHY'
}

export enum CircuitBreakerState {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED'
}

export interface CircuitBreakerConfig {
    healthCheckAttemptsToClose: number;
}

export interface CircuitBreakerStats {
    state: CircuitBreakerState;
    openedAt: number;
    lastFailureReason: string;
}


export const TYPES = {
    CacheService: Symbol.for('CacheService'),
    AttestationService: Symbol.for('AttestationService'),
    MetricsMonitoringService: Symbol.for('MetricsMonitoringService'),
    HealthMonitoringService: Symbol.for('HealthMonitoringService'),
    KeyManager: Symbol.for('KeyManager'),
    CircuitBreakerService: Symbol.for('CircuitBreakerService'),

    PricingService: Symbol.for('PricingService'),
    PricingServiceFactory: Symbol.for('PricingServiceFactory'),
    SwapRateService: Symbol.for('SwapRateService'),
    SwapRateController: Symbol.for('SwapRateController'),
    ConfigUtil: Symbol.for('ConfigUtil'),
};

export interface AttestationData {
    swapRate: number;
    timestamp: number;
}

export interface AttestationResult {
    signature: string;
    recovery_id: number;
}

export interface KeyPair {
    privateKey: Uint8Array;
    publicKey: string;
}


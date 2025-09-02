import {PricingServiceBase} from "./IPricingService";
import {HermesClient, PriceUpdate} from "@pythnetwork/hermes-client";
import {HealthCheckResult, HealthStatus, PriceFeed, PricingServicesConfig} from "../../types/common";
import {CacheService} from "../cache/cacheService";
import axios from "axios";
const ENV:string = process.env.ENVIRONMENT || 'dev';
import {injectable} from "inversify";
import ISwapRateService from "../swap/ISwapRateService";
import {logger} from "../../utils/logger";
import {ConfigurationError, PriceServiceError} from "../../utils/error";

@injectable()
export default class PythPricingService extends PricingServiceBase {

    private priceServiceConnection: HermesClient;
    private solUsdFeedID;
    private twozUsdFeedID;
    private cacheService: CacheService;
    private readonly maxRetries: number = 3;
    private readonly retryDelayMs: number = 1000;

    constructor(pricingServicesConfig:PricingServicesConfig) {
        super();
        this.validateConfig(pricingServicesConfig);
        this.pricingServicesConfig = pricingServicesConfig
    }

    init(): void {
        try {
            if (!this.pricingServicesConfig.endpoint) {
                throw new ConfigurationError('Cannot initialize: missing endpoint');
            }
            this.priceServiceConnection = new HermesClient(this.pricingServicesConfig.endpoint, {});
            this.solUsdFeedID = this.pricingServicesConfig.priceFeedIds[PriceFeed.SOL_USD];
            this.twozUsdFeedID = this.pricingServicesConfig.priceFeedIds[PriceFeed.TWOZ_USD];
            logger.info('PythPricingService initialized successfully', {
                endpoint: this.pricingServicesConfig.endpoint,
                solFeedId: this.solUsdFeedID,
                twozFeedId: this.twozUsdFeedID
            });
        } catch (error) {
            logger.error('Failed to initialize PythPricingService', { error });
            throw error;
        }
    }

    private validateConfig(config: PricingServicesConfig): void {
        if (!config) {
            throw new ConfigurationError('PricingServicesConfig is required');
        }
        if (!config.endpoint) {
            throw new ConfigurationError('Endpoint is required in pricing services config');
        }
        if (!config.priceFeedIds) {
            throw new ConfigurationError('Price feed IDs are required in pricing services config');
        }
    }

    private validatePriceData(priceData: PriceUpdate, feedID: string): void {
        if (!priceData) {
            throw new PriceServiceError('Received null or undefined price data', feedID);
        }
        if (!priceData.parsed || !Array.isArray(priceData.parsed) || priceData.parsed.length === 0) {
            throw new PriceServiceError('Invalid price data structure: missing or empty parsed array', feedID);
        }

        const firstPrice = priceData.parsed[0];
        if (!firstPrice || !firstPrice.price) {
            throw new PriceServiceError('Invalid price data structure: missing price object', feedID);
        }

        const { price, conf, expo, publish_time } = firstPrice.price;
        if (price === undefined || price === null) {
            throw new PriceServiceError('Price value is missing or null', feedID);
        }
        if (conf === undefined || conf === null) {
            throw new PriceServiceError('Confidence value is missing or null', feedID);
        }
        if (expo === undefined || expo === null) {
            throw new PriceServiceError('Exponent value is missing or null', feedID);
        }
        if (!publish_time) {
            throw new PriceServiceError('Publish time is missing', feedID);
        }
    }

    setCacheService(cacheService: CacheService): void {
        this.cacheService = cacheService;
    }

    setSwapRateService(swapRateService: ISwapRateService): void {
        this.swapRateService = swapRateService;
    }


    async fetchPrice(feedID: string): Promise<any> {
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const priceData: PriceUpdate = await this.priceServiceConnection.getLatestPriceUpdates(
                    [feedID],
                    {encoding: "base64"}
                )
                this.validatePriceData(priceData, feedID);
                logger.info(`Successfully fetched price data for FeedID: ${feedID}`, {
                    parsed: priceData.parsed[0],
                    attempt
                });
                const priceDataValue = {
                    confidence: priceData.parsed[0].price.conf,
                    price: priceData.parsed[0].price.price,
                    exponent: priceData.parsed[0].price.expo,
                    timestamp: priceData.parsed[0].price.publish_time
                }
                try {
                    await this.cacheService.add(
                        `${this.getPricingServiceType()}-${ENV}-last-price-update`,
                        new Date().toISOString(),
                        false
                    );
                } catch (cacheError) {
                    logger.warn('Failed to cache price update timestamp', {
                        error: cacheError,
                        feedID
                    });
                }
                return priceDataValue;

            } catch (error) {
                lastError = error as Error;
                logger.warn(`Attempt ${attempt}/${this.maxRetries} failed for feed ${feedID}`, {
                    error: error instanceof Error ? error.message : String(error)
                });

                if (error instanceof ConfigurationError ||
                    (error instanceof PriceServiceError && error.message.includes('Invalid'))) {
                    break;
                }

                if (attempt < this.maxRetries) {
                    await this.delay(this.retryDelayMs * attempt);
                }
            }
        }

        const errorMessage = `Failed to fetch price for feed ${feedID} after ${this.maxRetries} attempts`;
        logger.error(errorMessage, {lastError});
        throw new PriceServiceError(errorMessage, feedID, lastError);
    }

    async retrieveSwapRate() {
        if (!this.solUsdFeedID || !this.twozUsdFeedID) {
            logger.error('Missing feed IDs for price retrieval');
            throw new Error('Missing required feed IDs');
        }
        const [solPrice, twozPrice] = await Promise.allSettled([
            this.fetchPrice(this.solUsdFeedID),
            this.fetchPrice(this.twozUsdFeedID)
        ]);

        if (solPrice.status === 'rejected') {
            throw new PriceServiceError(
                'Failed to fetch SOL price',
                this.solUsdFeedID,
                solPrice.reason
            );
        }

        if (twozPrice.status === 'rejected') {
            throw new PriceServiceError(
                'Failed to fetch TWOZ price',
                this.twozUsdFeedID,
                twozPrice.reason
            );
        }

        logger.info("Successfully fetched prices", {
            solPrice: solPrice.value,
            twozPrice: twozPrice.value
        });
        return await this.swapRateCal(solPrice.value, twozPrice.value)
    }

    async getHealth(): Promise<HealthCheckResult> {
        let lastPriceUpdate: string = '';
        let isCacheConnected: boolean = false;
        let isPricingConnected: boolean = false;

        try {
            lastPriceUpdate = await this.cacheService.get(`${this.getPricingServiceType()}-${ENV}-last-price-update`);
            isCacheConnected = true;
        } catch (error) {
            logger.error("Error fetching from cache: ", error);
        }

        try {
            const response = await axios.get(new URL('live', this.pricingServicesConfig.endpoint).toString(), {timeout: 10000});
            isPricingConnected = response.status < 400;
            logger.info('Pricing service health check completed', {
                status: response.status,
                connected: isPricingConnected
            });
        } catch (error) {
            logger.error("Error connecting to pricing service: ", error);
        }

        const isConnected = isCacheConnected && isPricingConnected;

        return {
            serviceType: this.getPricingServiceType(),
            status: isConnected ? HealthStatus.HEALTHY : HealthStatus.UN_HEALTHY,
            hermes_connected: isPricingConnected,
            cache_connected: isCacheConnected,
            last_price_update: lastPriceUpdate,
        };
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}
import {PricingServiceBase} from "./IPricingService";
import {HermesClient, PriceUpdate} from "@pythnetwork/hermes-client";
import {HealthCheckResult, HealthStatus, PriceFeed, PricingServicesConfig} from "../../types/common";
import {CacheService} from "../cache/cacheService";
import axios from "axios";
const ENV:string = process.env.ENVIRONMENT || 'dev';
import {injectable} from "inversify";
import ISwapRateService from "../swap/ISwapRateService";
import {logger} from "../../utils/logger";

@injectable()
export default class PythPricingService extends PricingServiceBase {

    private priceServiceConnection: HermesClient;
    private solUsdFeedID;
    private twozUsdFeedID;
    private cacheService: CacheService;

    constructor(pricingServicesConfig:PricingServicesConfig) {
        super();
        this.pricingServicesConfig = pricingServicesConfig
    }

    init(): void {
        this.priceServiceConnection = new HermesClient(this.pricingServicesConfig.endpoint, {});
        this.solUsdFeedID = this.pricingServicesConfig.priceFeedIds[PriceFeed.SOL_USD];
        this.twozUsdFeedID = this.pricingServicesConfig.priceFeedIds[PriceFeed.TWOZ_USD];
    }

    setCacheService(cacheService: CacheService): void {
        this.cacheService = cacheService;
    }

    setSwapRateService(swapRateService: ISwapRateService): void {
        this.swapRateService = swapRateService;
    }


    async fetchPrice(feedID: string): Promise<any> {
        try {
            const priceData: PriceUpdate = await this.priceServiceConnection.getLatestPriceUpdates(
                [feedID],
                {encoding: "base64"}
            )
            logger.info(`Fetched Price data for FeedID: ${feedID}`, priceData.parsed)
            const priceDataValue = {
                confidence: priceData.parsed[0].price.conf,
                price: priceData.parsed[0].price.price,
                exponent: priceData.parsed[0].price.expo,
                timestamp: priceData.parsed[0].price.publish_time
            }
            await this.cacheService.add(`${this.getPricingServiceType()}-${ENV}-last-price-update`,new Date().toISOString(),false);
            return priceDataValue;

        } catch (error) {
            logger.error("Error fetching price: ", error)
            throw error;

        }

    }

    async retrieveSwapRate() {
        if (!this.solUsdFeedID || !this.twozUsdFeedID) {
            logger.error('Missing feed IDs for price retrieval');
            throw new Error('Missing required feed IDs');
        }
        const solPrice = await this.fetchPrice(this.solUsdFeedID);
        const twozPrice = await this.fetchPrice(this.twozUsdFeedID);
        logger.info("Sol Price: ", solPrice)
        logger.info("Twoz Price: ", twozPrice)
        return await this.swapRateCal(solPrice, twozPrice)
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
            await axios.get(new URL('live', this.pricingServicesConfig.endpoint).toString());
            isPricingConnected = true;
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


}
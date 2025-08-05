import {PricingServiceBase} from "./pricingService";
import {HermesClient, PriceUpdate} from "@pythnetwork/hermes-client";
import {HealthCheckResult, PriceFeed, PricingServicesConfig} from "../../types/common";
import {PythSwapRateService} from "../swap/PythSwapRateService";
import {CacheService} from "../cache/cacheService";
import {RedisCacheService} from "../cache/redisCacheService";
const ENV:string = process.env.ENV || 'dev';

export default class PythPricingService extends PricingServiceBase {

    private priceServiceConnection: HermesClient;
    private solUsdFeedID;
    private twozUsdFeedID;
    private isConnected: boolean;

    private cacheService: CacheService;

    constructor(pricingServicesConfig:PricingServicesConfig) {
        super();
        this.pricingServicesConfig = pricingServicesConfig
    }

    init(): void {
        this.priceServiceConnection = new HermesClient(this.pricingServicesConfig.endpoint, {});
        this.swapRateService = new PythSwapRateService();
        this.solUsdFeedID = this.pricingServicesConfig.priceFeedIds[PriceFeed.SOL_USD];
        this.twozUsdFeedID = this.pricingServicesConfig.priceFeedIds[PriceFeed.TWOZ_USD];
        this.cacheService = RedisCacheService.getInstance();
    }

    async fetchPrice(feedID: string): Promise<any> {
        try {
            const priceData: PriceUpdate = await this.priceServiceConnection.getLatestPriceUpdates(
                [feedID],
                {encoding: "base64"}
            )
            console.log(priceData.parsed)
            const priceDataValue = {
                confidence: priceData.parsed[0].price.conf,
                price: priceData.parsed[0].price.price,
                exponent: priceData.parsed[0].price.expo,
                timestamp: priceData.parsed[0].price.publish_time
            }
            this.isConnected = true;
            await this.cacheService.add(`${this.getPricingServiceType()}-${ENV}-last-price-update`,new Date().toISOString(),false);
            return priceDataValue;

        } catch (error) {
            console.error("Error fetching price: ", error)
            this.isConnected = false;
            throw error;

        }

    }

    async retrieveSwapRate() {
        if (!this.solUsdFeedID || !this.twozUsdFeedID) {
            return;
        }
        const solPrice = await this.fetchPrice(this.solUsdFeedID);
        const twozPrice = await this.fetchPrice(this.twozUsdFeedID);
        console.log("Sol Price: ", solPrice)
        console.log("Twoz Price: ", twozPrice)
        return await this.swapRateCal(solPrice, twozPrice)
    }

    async getHealth(): Promise<HealthCheckResult> {
        let lastPriceUpdate: string;
        try {
            lastPriceUpdate = await this.cacheService.get(`${this.getPricingServiceType()}-${ENV}-last-price-update`);
            await this.priceServiceConnection.getLatestPriceUpdates(
                [this.solUsdFeedID],
                {encoding: "base64"}
            )
            this.isConnected = true;

        } catch (error) {
            console.error("Error fetching price: ", error)
            this.isConnected = false;

        }

        return {
            serviceType: this.getPricingServiceType(),
            status : this.isConnected ? "Healthy" : "Service not available",
            hermes_connected : this.isConnected,
            last_price_update: lastPriceUpdate,
        }
    }


}
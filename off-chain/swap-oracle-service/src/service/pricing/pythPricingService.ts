import {PricingServiceBase} from "./IPricingService";
import {HermesClient, PriceUpdate} from "@pythnetwork/hermes-client";
import {HealthCheckResult, HealthStatus, PriceFeed, PricingServicesConfig} from "../../types/common";
import {CacheService} from "../cache/cacheService";
import axios from "axios";
const ENV:string = process.env.ENVIRONMENT || 'dev';
import {injectable} from "inversify";
import ISwapRateService from "../swap/ISwapRateService";

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
            console.log(priceData.parsed)
            const priceDataValue = {
                confidence: priceData.parsed[0].price.conf,
                price: priceData.parsed[0].price.price,
                exponent: priceData.parsed[0].price.expo,
                timestamp: priceData.parsed[0].price.publish_time
            }
            await this.cacheService.add(`${this.getPricingServiceType()}-${ENV}-last-price-update`,new Date().toISOString(),false);
            return priceDataValue;

        } catch (error) {
            console.error("Error fetching price: ", error)
            throw error;

        }

    }

    async retrieveSwapRate() {
        if (!this.solUsdFeedID || !this.twozUsdFeedID) {
            console.error('Missing feed IDs for price retrieval');
            throw new Error('Missing required feed IDs');
        }
        const solPrice = await this.fetchPrice(this.solUsdFeedID);
        const twozPrice = await this.fetchPrice(this.twozUsdFeedID);
        console.log("Sol Price: ", solPrice)
        console.log("Twoz Price: ", twozPrice)
        return await this.swapRateCal(solPrice, twozPrice)
    }

    async getHealth(): Promise<HealthCheckResult> {
        let lastPriceUpdate: string;
        let isConnected: boolean;
        try {
            lastPriceUpdate = await this.cacheService.get(`${this.getPricingServiceType()}-${ENV}-last-price-update`);
            await axios.get(`${this.pricingServicesConfig.endpoint}/live`)
            isConnected = true;

        } catch (error) {
            console.error("Error fetching price: ", error)
            isConnected = false;

        }

        return {
            serviceType: this.getPricingServiceType(),
            status : isConnected ? HealthStatus.HEALTHY : HealthStatus.UN_HEALTHY,
            hermes_connected : isConnected,
            last_price_update: lastPriceUpdate,
        }
    }


}
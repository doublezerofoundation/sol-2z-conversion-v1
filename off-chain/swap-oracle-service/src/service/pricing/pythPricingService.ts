import {PricingServiceBase} from "./pricingService";
import {HermesClient, PriceUpdate} from "@pythnetwork/hermes-client";
import {PriceFeed, PricingServicesConfig} from "../../types/common";
import { PythSwapRateService } from "../swap/PythSwapRateService";


export default class PythPricingService extends PricingServiceBase {
    private priceServiceConnection: HermesClient;
    private solUsdFeedID;
    private twozUsdFeedID;

    constructor(pricingServicesConfig:PricingServicesConfig) {
        super();
        this.pricingServicesConfig = pricingServicesConfig
    }

    init(): void {
        this.priceServiceConnection = new HermesClient(this.pricingServicesConfig.endpoint, {});
        this.swapRateService = new PythSwapRateService();
        this.solUsdFeedID = this.pricingServicesConfig.priceFeedIds[PriceFeed.SOL_USD];
        this.twozUsdFeedID = this.pricingServicesConfig.priceFeedIds[PriceFeed.TWOZ_USD];
    }

    async fetchPrice(feedID: string): Promise<any> {
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
        return priceDataValue;
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


}
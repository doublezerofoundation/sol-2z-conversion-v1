import PricingService from "./pricingService";
import {HermesClient, PriceUpdate} from "@pythnetwork/hermes-client";
import {configUtil} from "../../utils/configUtil";
import {ConfigField} from "../../types/common";


export default class PythPricingService implements PricingService{
    private priceServiceConnection: HermesClient;

    init(): void {
        const pricingServiceConfig = configUtil.get<any>(ConfigField.PRICING_SERVICE);
        const hermesUrl = pricingServiceConfig.hermesEndpoint || pricingServiceConfig.hermesUrl;
        console.log(hermesUrl);
        console.log("init")
        this.priceServiceConnection = new HermesClient(hermesUrl, {});


    }
    async fetchPrice(feedID: string): Promise<any> {
        const priceData: PriceUpdate = await this.priceServiceConnection.getLatestPriceUpdates(
            [feedID],
            { encoding: "base64" }
        )
        console.log(priceData.parsed)

        const priceDataValue = {
            confidence: priceData.parsed[0].price.conf,
            price: priceData.parsed[0].price.price,
            exponent: priceData.parsed[0].price.expo,
            timestamp: priceData.parsed[0].price.publish_time,
            signature: priceData.parsed[0].price.conf

        }

        return priceDataValue;

    }
    convert(): number {
        throw new Error("Method not implemented.");
    }

}
import {ConfigField, PricingServicesConfig, PricingServiceType} from "../types/common";
import {configUtil} from "../utils/configUtil";
import PythPricingService from "../service/pricing/pythPricingService";
import {PricingService} from "../service/pricing/pricingService";

export class PricingServiceFactory {
    static create(): PricingService[] {
        const pricingServicesConfig :PricingServicesConfig[] = configUtil.get<any>(ConfigField.PRICING_SERVICES);
        return pricingServicesConfig.map(pricingServiceConfig => {
            return this.fetchPricingService(pricingServiceConfig);

        });


    }

    private static fetchPricingService(pricingServicesConfig:PricingServicesConfig) {
        switch (pricingServicesConfig.type) {
            case PricingServiceType.PYTH:
                return new PythPricingService(pricingServicesConfig);
            // case PricingServiceType.CHAINLINK:
            //     return new ChainlinkPricingService();
            default:
                throw new Error(`Unsupported pricing service type: ${pricingServicesConfig.type}`);
        }
    }
}

import {ConfigField, PricingServiceType} from "../types/common";
import {configUtil} from "../utils/configUtil";
import PythPricingService from "../service/pricing/pythPricingService";
import PricingService from "../service/pricing/pricingService";

export class PricingServiceFactory {
    static create(serviceType?: PricingServiceType): PricingService {
        const type = serviceType || configUtil.get<PricingServiceType>(ConfigField.PRICING_SERVICE_TYPE) || PricingServiceType.PYTH;

        switch (type) {
            case PricingServiceType.PYTH:
                return new PythPricingService();
            // case PricingServiceType.CHAINLINK:
            //     return new ChainlinkPricingService();
            default:
                throw new Error(`Unsupported pricing service type: ${type}`);
        }
    }
}

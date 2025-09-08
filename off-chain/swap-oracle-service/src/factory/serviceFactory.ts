import {ConfigField, PricingServicesConfig, PricingServiceType, TYPES} from "../types/common";
import {ConfigUtil, configUtil} from "../utils/configUtil";
import PythPricingService from "../service/pricing/pythPricingService";
import {IPricingService} from "../service/pricing/IPricingService";
import {inject, injectable} from "inversify";
import {CacheService} from "../service/cache/cacheService";
import ISwapRateService from "../service/swap/ISwapRateService";

@injectable()
export class PricingServiceFactory {

    constructor(
        @inject(TYPES.ConfigUtil) private configUtil: ConfigUtil,
        @inject(TYPES.CacheService) private cacheService: CacheService,
        @inject(TYPES.SwapRateService) private swapRateService: ISwapRateService,
    ) {

    }
    create(): IPricingService[] {
        const pricingServicesConfig = this.configUtil.get<any>(ConfigField.PRICING_SERVICES);
        return pricingServicesConfig.map(config =>
            this.createPricingService(config)
        );

    }

    private createPricingService(config: PricingServicesConfig): IPricingService {
        switch (config.type) {
            case PricingServiceType.PYTH:
                const pythService = new PythPricingService(config);
                pythService.setCacheService(this.cacheService);
                pythService.setSwapRateService(this.swapRateService);
                return pythService;
            default:
                throw new Error(`Unsupported pricing service type: ${config.type}`);
        }
    }

}

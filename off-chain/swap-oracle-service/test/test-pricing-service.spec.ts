import container from "../src/factory/serviceContainer";
import {ConfigField, TYPES} from "../src/types/common";
import {MockRedisCacheService} from "./mock/MockRedisCacheService";
import {ConfigUtil} from "../src/utils/configUtil";
import PythPricingService from "../src/service/pricing/pythPricingService";
import ISwapRateService from "../src/service/swap/ISwapRateService";
import {assert} from "chai";


describe('Pricing Service testcases', () => {


    let pricingService: PythPricingService;
    beforeEach(async () => {
        const serviceConfig = container.get<ConfigUtil>(TYPES.ConfigUtil).get<any>(ConfigField.PRICING_SERVICES);
        const swapRateService = container.get<ISwapRateService>(TYPES.SwapRateService);
        pricingService = new PythPricingService(serviceConfig[0])
        pricingService.setCacheService(new MockRedisCacheService())
        pricingService.setSwapRateService(swapRateService)
        pricingService.init()
    })

    it("Should be able to get swap rate", async()=> {
        console.log("Get price rate")
        const swapRateResult = await pricingService.retrieveSwapRate();
        assert.isNotNull(swapRateResult)
        assert.isNotNull(swapRateResult.swapRate, 'swapRate should not be null');
        assert.isNotNull(swapRateResult.solPriceUsd, 'solPriceUsd should not be null');
        assert.isNotNull(swapRateResult.twozPriceUsd, 'twozPriceUsd should not be null');
        assert.isNotNull(swapRateResult.last_price_update, 'last_price_update should not be null');

        assert.isNumber(swapRateResult.swapRate, 'swapRate should be a number');
        assert.isNumber(swapRateResult.solPriceUsd, 'solPriceUsd should be a number');
        assert.isNumber(swapRateResult.twozPriceUsd, 'twozPriceUsd should be a number');
        assert.isString(swapRateResult.last_price_update, 'last_price_update should be a string');
    })


    it("Should be able to get health", async()=>{
        console.log("Get health")
        const healthResult = await pricingService.getHealth();
        assert.isNotNull(healthResult)
        assert.isNotNull(healthResult.status, 'status should not be null');
        assert.isNotNull(healthResult.serviceType, 'serviceType should not be null');
        assert.isTrue(healthResult.hermes_connected, 'hermes_connected should be true');
    })


})
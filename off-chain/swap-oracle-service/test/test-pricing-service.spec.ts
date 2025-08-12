import container from "../src/factory/serviceContainer";
import {ConfigField, TYPES} from "../src/types/common";
import {MockRedisCacheService} from "./mock/MockRedisCacheService";
import {ConfigUtil} from "../lib/utils/configUtil";
import PythPricingService from "../lib/service/pricing/pythPricingService";
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
        assert.doesNotThrow(async () => {
            console.log("Get price rate")
            const swapRateResult = await pricingService.retrieveSwapRate();
            console.log(swapRateResult)
        })
        const swapRateResult = await pricingService.retrieveSwapRate();
        console.log(swapRateResult)
    })


    it("Should be able to get health", async()=>{
        assert.doesNotThrow(async () => {
            console.log("Get health")
            const healthResult = await pricingService.getHealth();
            console.log(healthResult)
        })
    })


})
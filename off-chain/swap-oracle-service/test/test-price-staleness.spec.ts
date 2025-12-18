import container from "../src/factory/serviceContainer";
import {ConfigField, TYPES} from "../src/types/common";
import {MockRedisCacheService} from "./mock/MockRedisCacheService";
import {ConfigUtil} from "../src/utils/configUtil";
import {PythSwapRateService} from "../src/service/swap/PythSwapRateService";
import {PriceStalenessError} from "../src/utils/error";
import {assert} from "chai";


describe('Price staleness validation tests', () => {

    let swapRateService: PythSwapRateService;
    
    beforeEach(async () => {
        swapRateService = container.get<PythSwapRateService>(TYPES.SwapRateService);
    });

    it("Should accept fresh price data (within 60s)", async () => {
        const nowUnix = Math.floor(Date.now() / 1000);
        
        const solPriceData = {
            price: '20000000000',
            confidence: '10000000',
            exponent: -8,
            publishTime: nowUnix - 30
        };
        
        const twozPriceData = {
            price: '100000000',
            confidence: '100000',
            exponent: -8,
            publishTime: nowUnix - 20
        };
        
        const result = swapRateService.swapRateCalculation(solPriceData, twozPriceData);
        
        assert.isNotNull(result);
        assert.isNumber(result.swapRate);
        assert.isNumber(result.publishTime);
        assert.equal(result.publishTime, Math.min(solPriceData.publishTime, twozPriceData.publishTime));
        assert.equal(result.solPublishTime, solPriceData.publishTime);
        assert.equal(result.twozPublishTime, twozPriceData.publishTime);
    });

    it("Should reject stale SOL price data (>60s)", async () => {
        const nowUnix = Math.floor(Date.now() / 1000);
        
        const solPriceData = {
            price: '20000000000',
            confidence: '10000000',
            exponent: -8,
            publishTime: nowUnix - 70
        };
        
        const twozPriceData = {
            price: '100000000',
            confidence: '100000',
            exponent: -8,
            publishTime: nowUnix - 20
        };
        
        try {
            swapRateService.swapRateCalculation(solPriceData, twozPriceData);
            assert.fail('Should have thrown PriceStalenessError');
        } catch (error) {
            assert.instanceOf(error, PriceStalenessError);
            assert.equal((error as PriceStalenessError).feedId, 'SOL/USD');
            assert.approximately((error as PriceStalenessError).ageSeconds, 70, 2);
            assert.equal((error as PriceStalenessError).maxAgeSeconds, 60);
        }
    });

    it("Should reject stale 2Z price data (>60s)", async () => {
        const nowUnix = Math.floor(Date.now() / 1000);
        
        const solPriceData = {
            price: '20000000000',
            confidence: '100000000',
            exponent: -8,
            publishTime: nowUnix - 30
        };
        
        const twozPriceData = {
            price: '100000000',
            confidence: '50000000',
            exponent: -8,
            publishTime: nowUnix - 80
        };
        
        try {
            swapRateService.swapRateCalculation(solPriceData, twozPriceData);
            assert.fail('Should have thrown PriceStalenessError');
        } catch (error) {
            assert.instanceOf(error, PriceStalenessError);
            assert.equal((error as PriceStalenessError).feedId, '2Z/USD');
            assert.approximately((error as PriceStalenessError).ageSeconds, 80, 2);
        }
    });

    it("Should reject when both feeds are stale", async () => {
        const nowUnix = Math.floor(Date.now() / 1000);
        
        const solPriceData = {
            price: '20000000000',
            confidence: '100000000',
            exponent: -8,
            publishTime: nowUnix - 90
        };
        
        const twozPriceData = {
            price: '100000000',
            confidence: '50000000',
            exponent: -8,
            publishTime: nowUnix - 100
        };
        
        try {
            swapRateService.swapRateCalculation(solPriceData, twozPriceData);
            assert.fail('Should have thrown PriceStalenessError');
        } catch (error) {
            assert.instanceOf(error, PriceStalenessError);
            assert.equal((error as PriceStalenessError).feedId, 'SOL/USD');
        }
    });

    it("Should accept price at exactly 60s age (boundary test)", async () => {
        const nowUnix = Math.floor(Date.now() / 1000);
        
        const solPriceData = {
            price: '20000000000',
            confidence: '10000000',
            exponent: -8,
            publishTime: nowUnix - 60
        };
        
        const twozPriceData = {
            price: '100000000',
            confidence: '100000',
            exponent: -8,
            publishTime: nowUnix - 59
        };
        
        const result = swapRateService.swapRateCalculation(solPriceData, twozPriceData);
        assert.isNotNull(result);
        assert.isNumber(result.publishTime);
    });

    it("Should reject price at 61s age (boundary test)", async () => {
        const nowUnix = Math.floor(Date.now() / 1000);
        
        const solPriceData = {
            price: '20000000000',
            confidence: '100000000',
            exponent: -8,
            publishTime: nowUnix - 61
        };
        
        const twozPriceData = {
            price: '100000000',
            confidence: '50000000',
            exponent: -8,
            publishTime: nowUnix - 30
        };
        
        try {
            swapRateService.swapRateCalculation(solPriceData, twozPriceData);
            assert.fail('Should have thrown PriceStalenessError');
        } catch (error) {
            assert.instanceOf(error, PriceStalenessError);
        }
    });

    it("Should use minimum publishTime as effective timestamp", async () => {
        const nowUnix = Math.floor(Date.now() / 1000);
        
        const solPriceData = {
            price: '20000000000',
            confidence: '10000000',
            exponent: -8,
            publishTime: nowUnix - 45
        };
        
        const twozPriceData = {
            price: '100000000',
            confidence: '100000',
            exponent: -8,
            publishTime: nowUnix - 25
        };
        
        const result = swapRateService.swapRateCalculation(solPriceData, twozPriceData);
        
        assert.equal(result.publishTime, solPriceData.publishTime);
        assert.isTrue(result.publishTime! < result.twozPublishTime!);
    });
});

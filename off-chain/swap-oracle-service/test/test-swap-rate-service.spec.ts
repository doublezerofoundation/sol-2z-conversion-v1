import container from "../src/factory/serviceContainer";
import {TYPES} from "../src/types/common";
import ISwapRateService from "../src/service/swap/ISwapRateService";
import {assert} from "chai";

const successTestData = [
    {
       solPriceData: {
            price: 2000000,
            exponent: 6,
            confidence: 4000

       },
        twozPriceData: {
                price: 1000000,
                exponent: 6,
                confidence: 5000
       },
        expectedSwapRate: 1.98606965

    },
    {
        solPriceData: {
            price: 2500000,
            exponent: 6,
            confidence: 1000

        },
        twozPriceData: {
            price: 1500000,
            exponent: 6,
            confidence: 3000
        },
        expectedSwapRate: 1.66267465

    },
    {
        solPriceData: {
            price: 3000000,
            exponent: 6,
            confidence: 3500

        },
        twozPriceData: {
            price: 5500000,
            exponent: 6,
            confidence: 4440
        },
        expectedSwapRate: 0.54437872

    },
]

describe('SwapRateService', () => {

    it("Validate swap-rate", async ()=> {
        const swapRateService = container.get<ISwapRateService>(TYPES.SwapRateService);
        for(const testData of successTestData) {
            const swapRate = await swapRateService.swapRateCalculation(testData.solPriceData, testData.twozPriceData)
            console.log("swapRate: ", swapRate.swapRate)
            console.log("expectedSwapRate: ", testData.expectedSwapRate)
            assert.equal(swapRate.swapRate, testData.expectedSwapRate)
        }

    })


})
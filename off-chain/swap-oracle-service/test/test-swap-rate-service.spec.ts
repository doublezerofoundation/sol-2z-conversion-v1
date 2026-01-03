import container from "../src/factory/serviceContainer";
import {TYPES} from "../src/types/common";
import ISwapRateService from "../src/service/swap/ISwapRateService";
import {assert, expect} from "chai";
import {PriceServiceUnavailableError} from "../src/utils/error";

const addPublishTime = (priceData: any) => {
    const nowUnix = Math.floor(Date.now() / 1000);
    return { ...priceData, publishTime: nowUnix - 10 };
};

const successTestData = [
    {
        name: "Basic 2:1 ratio",
        solPriceData: {
            price: 2000000,
            exponent: -6,
            confidence: 4000
        },
        twozPriceData: {
            price: 1000000,
            exponent: -6,
            confidence: 5000
        },
        expectedSwapRate: 200000000
    },
    {
        name: "Fractional ratio with integer precision",
        solPriceData: {
            price: 2500000,
            exponent: -6,
            confidence: 1000
        },
        twozPriceData: {
            price: 1500000,
            exponent: -6,
            confidence: 3000
        },
        expectedSwapRate: 166666666 // (2500000/1500000) * 1e8 = 166666666 (integer division truncates)
    },
    {
        name: "Less than 1 ratio",
        solPriceData: {
            price: 3000000,
            exponent: -6,
            confidence: 3500
        },
        twozPriceData: {
            price: 5500000,
            exponent: -6,
            confidence: 4440
        },
        expectedSwapRate: 54545454 // (3000000/5500000) * 1e8 = 54545454 (integer division)
    },
    {
        name: "Very small values with negative exponents",
        solPriceData: {
            price: 15000000000, // $150 with exponent -8
            exponent: -8,
            confidence: 500000 // $0.005
        },
        twozPriceData: {
            price: 100000000, // $1 with exponent -8
            exponent: -8,
            confidence: 200000 // $0.002
        },
        expectedSwapRate: 15000000000
    },
    {
        name: "Equal prices should give 1:1 ratio",
        solPriceData: {
            price: 1000000,
            exponent: -6,
            confidence: 1000
        },
        twozPriceData: {
            price: 1000000,
            exponent: -6,
            confidence: 1000
        },
        expectedSwapRate: 100000000
    },
    {
        name: "High precision decimal result",
        solPriceData: {
            price: 1234567,
            exponent: -6,
            confidence: 1000
        },
        twozPriceData: {
            price: 9876543,
            exponent: -6,
            confidence: 2000
        },
        expectedSwapRate: 12499991 // (1234567/9876543) * 1e8 = 12499991 (BigInt integer division)
    }
];

const confidenceFailureTestData = [
    {
        name: "SOL confidence too high",
        solPriceData: {
            price: 1000000, // $1
            exponent: -6,
            confidence: 8000 // $0.008 = 0.8% confidence ratio
        },
        twozPriceData: {
            price: 1000000, // $1
            exponent: -6,
            confidence: 1000 // $0.001 = 0.1% confidence ratio
        },
        shouldPass: false
    },
    {
        name: "TWOZ confidence too high",
        solPriceData: {
            price: 1000000, // $1
            exponent: -6,
            confidence: 1000 // $0.001 = 0.1% confidence ratio
        },
        twozPriceData: {
            price: 1000000, // $1
            exponent: -6,
            confidence: 8000 // $0.008 = 0.8% confidence ratio
        },
        shouldPass: false
    },
    {
        name: "Both confidences too high",
        solPriceData: {
            price: 1000000, // $1
            exponent: -6,
            confidence: 5000 // $0.005 = 0.5% confidence ratio
        },
        twozPriceData: {
            price: 1000000, // $1
            exponent: -6,
            confidence: 5000 // $0.005 = 0.5% confidence ratio
        },
        shouldPass: false
    },
    {
        name: "Edge case: exactly at threshold (should pass)",
        solPriceData: {
            price: 1000000, // $1
            exponent: -6,
            confidence: 3500 // $0.0035 = 0.35% confidence ratio
        },
        twozPriceData: {
            price: 1000000, // $1
            exponent: -6,
            confidence: 3500 // $0.0035 = 0.35% confidence ratio
        },
        shouldPass: true,
        expectedSwapRate: 100000000
    },
    {
        name: "Just over threshold (should fail)",
        solPriceData: {
            price: 1000000, // $1
            exponent: -6,
            confidence: 3501 // $0.003501 = 0.3501% confidence ratio
        },
        twozPriceData: {
            price: 1000000, // $1
            exponent: -6,
            confidence: 3501 // $0.003501 = 0.3501% confidence ratio
        },
        shouldPass: false
    }
];

const edgeCaseTestData = [
    {
        name: "Zero confidence values",
        solPriceData: {
            price: 1000000,
            exponent: -6,
            confidence: 0
        },
        twozPriceData: {
            price: 500000,
            exponent: -6,
            confidence: 0
        },
        expectedSwapRate: 200000000
    },
    {
        name: "Very small prices with high exponents",
        solPriceData: {
            price: 1, // 1 * 10^-12 = very small number
            exponent: -12,
            confidence: 0
        },
        twozPriceData: {
            price: 1, // 1 * 10^-12 = very small number
            exponent: -12,
            confidence: 0
        },
        expectedSwapRate: 100000000
    },
    {
        name: "String price inputs",
        solPriceData: {
            price: "2000000",
            exponent: -6,
            confidence: "1000"
        },
        twozPriceData: {
            price: "1000000",
            exponent: -6,
            confidence: "500"
        },
        expectedSwapRate: 200000000
    }
];

describe('SwapRateService', () => {
    let swapRateService: ISwapRateService;

    beforeEach(() => {
        swapRateService = container.get<ISwapRateService>(TYPES.SwapRateService);
    });

    describe('Successful swap rate calculations', () => {
        successTestData.forEach((testData) => {
            it(`should calculate correct swap rate: ${testData.name}`, async () => {
                const result = await swapRateService.swapRateCalculation(
                    addPublishTime(testData.solPriceData),
                    addPublishTime(testData.twozPriceData)
                );

                console.log(`Test: ${testData.name}`);
                console.log(`Calculated swapRate: ${result.swapRate}`);
                console.log(`Expected swapRate: ${testData.expectedSwapRate}`);

                // swapRate must be an integer (scaled by 1e8)
                expect(Number.isInteger(result.swapRate)).to.be.true;
                expect(result.swapRate).to.equal(testData.expectedSwapRate);
                expect(result.solPriceUsd).to.be.a('number');
                expect(result.twozPriceUsd).to.be.a('number');
                expect(result.last_price_update).to.be.a('string');
            });
        });
    });

    describe('Confidence threshold validation', () => {
        confidenceFailureTestData.forEach((testData) => {
            if (testData.shouldPass) {
                it(`should pass confidence check: ${testData.name}`, async () => {
                    const result = await swapRateService.swapRateCalculation(
                    addPublishTime(testData.solPriceData),
                    addPublishTime(testData.twozPriceData)
                );
                expect(result.swapRate).to.equal(testData.expectedSwapRate);
            });
        } else {
            it(`should fail confidence check: ${testData.name}`, async () => {
                try {
                    const result = await swapRateService.swapRateCalculation(
                        addPublishTime(testData.solPriceData),
                        addPublishTime(testData.twozPriceData)
                    );
                    console.log(result)
                    console.log(`Test: ${testData.name}`);
                    assert.fail('Expected PriceServiceUnavailableError to be thrown');
                } catch (error) {
                    expect(error).to.be.instanceOf(PriceServiceUnavailableError);
                }
            });
        }
    });
});

    describe('Edge cases and data type handling', () => {
        edgeCaseTestData.forEach((testData) => {
        it(`should handle edge case: ${testData.name}`, async () => {
            const result = await swapRateService.swapRateCalculation(
                addPublishTime(testData.solPriceData),
                addPublishTime(testData.twozPriceData)
            );

            // swapRate must be an integer
            expect(Number.isInteger(result.swapRate)).to.be.true;
            expect(result.swapRate).to.equal(testData.expectedSwapRate);
            expect(result.solPriceUsd).to.be.a('number');
            expect(result.twozPriceUsd).to.be.a('number');
        });
    });
    });

    describe('Price conversion validation', () => {
        it('should correctly convert prices with different exponents', async () => {
            const testCases = [
                {
                    price: 123456,
                    exponent: -6,
                    expected: 0.123456
                },
                {
                    price: 123456,
                    exponent: -8,
                    expected: 0.00123456
                },
                {
                    price: 123,
                    exponent: 2,
                    expected: 12300
                },
                {
                    price: "789",
                    exponent: -3,
                    expected: 0.789
                }
            ];

            testCases.forEach((testCase) => {
                const converted = swapRateService.convertPrice(testCase.price, testCase.exponent);
                expect(converted).to.be.approximately(testCase.expected, 0.0000001);
            });
        });
    });

    describe('Confidence ratio calculations', () => {
        it('should calculate confidence ratios correctly', async () => {
            const solPriceData = {
                price: 1000000,
                exponent: -6,
                confidence: 7000
            };
            const twozPriceData = {
                price: 1000000,
                exponent: -6,
                confidence: 0
            };

            const result = await swapRateService.swapRateCalculation(
                addPublishTime(solPriceData),
                addPublishTime(twozPriceData)
            );
            expect(Number.isInteger(result.swapRate)).to.be.true;
            expect(result.swapRate).to.equal(100000000);
        });

        it('should reject when combined confidence ratio exceeds 0.7%', async () => {
            const solPriceData = {
                price: 1000000,
                exponent: -6,
                confidence: 4000
            };
            const twozPriceData = {
                price: 1000000,
                exponent: -6,
                confidence: 4000
            };

            try {
                await swapRateService.swapRateCalculation(
                    addPublishTime(solPriceData),
                    addPublishTime(twozPriceData)
                );
                assert.fail('Expected PriceServiceUnavailableError to be thrown');
            } catch (error) {
                expect(error).to.be.instanceOf(PriceServiceUnavailableError);
            }
        });
    });

    describe('Return value structure validation', () => {
        it('should return properly structured PriceRate object', async () => {
            const solPriceData = {
                price: 1500000,
                exponent: -6,
                confidence: 1000
            };
            const twozPriceData = {
                price: 1000000,
                exponent: -6,
                confidence: 500
            };

            const result = await swapRateService.swapRateCalculation(
                addPublishTime(solPriceData),
                addPublishTime(twozPriceData)
            );

            expect(result).to.have.property('swapRate');
            expect(result).to.have.property('solPriceUsd');
            expect(result).to.have.property('twozPriceUsd');
            expect(result).to.have.property('last_price_update');
            expect(result).to.have.property('publishTime');
            expect(result).to.have.property('solPublishTime');
            expect(result).to.have.property('twozPublishTime');
            expect(result.swapRate).to.be.a('number');
            expect(Number.isInteger(result.swapRate)).to.be.true;
            expect(result.solPriceUsd).to.be.a('number');
            expect(result.twozPriceUsd).to.be.a('number');
            expect(result.last_price_update).to.be.a('string');
            expect(result.publishTime).to.be.a('number');
            expect(result.solPriceUsd).to.equal(1.5);
            expect(result.twozPriceUsd).to.equal(1.0);
            expect(result.swapRate).to.equal(150000000);
            expect(() => new Date(result.last_price_update)).to.not.throw();
        });
    });

    describe('JSON Integer Serialization (Regression)', () => {
        it('swapRate must be an integer for all realistic price combinations', async () => {
            const testCases = [
                { sol: { price: '10783061600', exponent: -8 }, twoz: { price: '100000000', exponent: -8 } },
                { sol: { price: '15000000000', exponent: -8 }, twoz: { price: '139000000', exponent: -8 } },
                { sol: { price: '8765432100', exponent: -8 }, twoz: { price: '123456789', exponent: -8 } },
                { sol: { price: '99999999', exponent: -6 }, twoz: { price: '33333333', exponent: -6 } },
            ];

            for (const tc of testCases) {
                const result = await swapRateService.swapRateCalculation(
                    addPublishTime({ ...tc.sol, confidence: 1000 }),
                    addPublishTime({ ...tc.twoz, confidence: 1000 })
                );

                expect(Number.isInteger(result.swapRate), 
                    `swapRate ${result.swapRate} must be an integer for SOL=${tc.sol.price} TWOZ=${tc.twoz.price}`
                ).to.be.true;
            }
        });

        it('JSON.stringify of swapRate must not contain a decimal point', async () => {
            const solPriceData = { price: '10783061600', exponent: -8, confidence: 1000 };
            const twozPriceData = { price: '100000000', exponent: -8, confidence: 1000 };

            const result = await swapRateService.swapRateCalculation(
                addPublishTime(solPriceData),
                addPublishTime(twozPriceData)
            );

            const jsonOutput = JSON.stringify({ swapRate: result.swapRate });
            
            expect(jsonOutput).to.not.include('.');
            
            expect(jsonOutput).to.match(/"swapRate":\d+}/);
        });

        it('swapRate fits in JavaScript safe integer range for JSON serialization', async () => {
            const solPriceData = { price: '15000000000', exponent: -8, confidence: 500000 };
            const twozPriceData = { price: '100000000', exponent: -8, confidence: 200000 };

            const result = await swapRateService.swapRateCalculation(
                addPublishTime(solPriceData),
                addPublishTime(twozPriceData)
            );

            expect(Number.isSafeInteger(result.swapRate)).to.be.true;
            expect(result.swapRate).to.be.greaterThan(0);
            expect(result.swapRate).to.be.lessThan(Number.MAX_SAFE_INTEGER);
        });

        it('attestation message must use integer format matching on-chain expectations', async () => {
            const solPriceData = { price: '15000000000', exponent: -8, confidence: 500000 };
            const twozPriceData = { price: '100000000', exponent: -8, confidence: 200000 };

            const result = await swapRateService.swapRateCalculation(
                addPublishTime(solPriceData),
                addPublishTime(twozPriceData)
            );

            const timestamp = Math.floor(Date.now() / 1000);
            const messageString = `${result.swapRate}|${timestamp}`;
            
            expect(messageString).to.not.include('.');
            
            expect(messageString).to.match(/^\d+\|\d+$/);
        });

        it('should handle edge case prices that historically caused float issues', async () => {
            // These specific values are known to cause IEEE 754 precision issues
            const problematicCases = [
                { name: 'Near powers of 2', sol: '134217728', twoz: '16777216', expo: -6 },
                { name: 'Repeating decimal division', sol: '100000000', twoz: '30000000', expo: -6 },
                { name: 'Large values near float precision limit', sol: '9007199254740992', twoz: '1000000000000', expo: -12 },
            ];

            for (const tc of problematicCases) {
                const result = await swapRateService.swapRateCalculation(
                    addPublishTime({ price: tc.sol, exponent: parseInt(tc.expo.toString()), confidence: 0 }),
                    addPublishTime({ price: tc.twoz, exponent: parseInt(tc.expo.toString()), confidence: 0 })
                );

                expect(Number.isInteger(result.swapRate),
                    `${tc.name}: swapRate ${result.swapRate} must be integer`
                ).to.be.true;

                const json = JSON.stringify({ swapRate: result.swapRate });
                expect(json).to.not.include('.', `${tc.name}: JSON must not have decimal`);
            }
        });
    });
});
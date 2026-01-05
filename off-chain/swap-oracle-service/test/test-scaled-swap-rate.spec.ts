import { expect } from "chai";
import { TWOZ_PRECISION } from "../src/types/common";

describe('Scaled Swap Rate Integer Guarantee', () => {

    const calculateScaledSwapRate = (swapRate: number): number => {
        return Math.floor(swapRate * TWOZ_PRECISION);
    };

    it('should return an integer for exact fractional swapRate', () => {
        const swapRate = 2.0;
        const result = calculateScaledSwapRate(swapRate);

        expect(result).to.equal(200000000);
        expect(Number.isInteger(result)).to.be.true;
    });

    it('should return an integer for problematic float multiplication', () => {
        const swapRate = 1.07830616;
        const result = calculateScaledSwapRate(swapRate);

        expect(result).to.equal(107830615);
        expect(Number.isInteger(result)).to.be.true;

        const json = JSON.stringify({ swapRate: result });
        expect(json).to.not.include('.');
    });

    it('should return an integer for fractional swapRate with many decimal places', () => {
        const swapRate = 1.66666667;
        const result = calculateScaledSwapRate(swapRate);

        expect(Number.isInteger(result)).to.be.true;
        const json = JSON.stringify({ swapRate: result });
        expect(json).to.not.include('.');
    });

    it('should handle sub-1 ratios correctly', () => {
        const swapRate = 0.545455;
        const result = calculateScaledSwapRate(swapRate);

        expect(Number.isInteger(result)).to.be.true;
        expect(result).to.be.greaterThan(0);
    });

    it('should handle very large swap rates', () => {
        const swapRate = 150.12345678;
        const result = calculateScaledSwapRate(swapRate);

        expect(Number.isInteger(result)).to.be.true;
        expect(result).to.equal(15012345678);
    });

    it('should ensure JSON serialization never has decimals', () => {
        const testCases = [
            1.07830616,
            0.99999999,
            1.00000001,
            2.33333333,
            0.10000001,
        ];

        testCases.forEach((swapRate) => {
            const result = calculateScaledSwapRate(swapRate);
            const json = JSON.stringify({ swapRate: result });

            expect(json).to.not.include('.', `Failed for swapRate=${swapRate}`);
            expect(Number.isInteger(result)).to.be.true;
        });
    });
});

describe('AttestationData BigInt swapRate', () => {
    it('should convert scaled swap rate to bigint for attestation', () => {
        const swapRate = 1.07830616;
        const scaledRate = Math.floor(swapRate * TWOZ_PRECISION);
        const bigIntRate = BigInt(scaledRate);

        const messageString = `${bigIntRate}|1234567890`;
        expect(messageString).to.equal('107830615|1234567890');
        expect(messageString).to.not.include('.');
    });

    it('should serialize bigint as integer in attestation message', () => {
        const testCases = [
            { swapRate: 2.0, expected: '200000000' },
            { swapRate: 1.666667, expected: '166666700' },
            { swapRate: 0.545455, expected: '54545500' },
        ];

        testCases.forEach(({ swapRate, expected }) => {
            const scaledRate = Math.floor(swapRate * TWOZ_PRECISION);
            const bigIntRate = BigInt(scaledRate);
            const str = bigIntRate.toString();

            expect(str).to.equal(expected);
            expect(str).to.not.include('.');
        });
    });
});

import { expect } from "chai";
import { calculateScaledSwapRate } from "../src/types/common";


describe('calculateScaledSwapRate (shared helper)', () => {

    it('should return exact expected bigint for clean ratio', () => {
        const result = calculateScaledSwapRate(2.0);
        expect(result).to.equal(BigInt(200000000));
    });

    it('should floor problematic float multiplication to exact bigint', () => {
        const result = calculateScaledSwapRate(1.07830616);
        expect(result).to.equal(BigInt(107830615));
    });

    it('should handle sub-1 ratio correctly', () => {
        const result = calculateScaledSwapRate(0.545455);
        expect(result).to.equal(BigInt(54545500));
    });
});

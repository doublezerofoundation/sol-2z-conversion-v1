import SwapRateService from "./swapRateService";
import {PriceRate} from "../../types/common";

export class PythSwapRateService implements SwapRateService {
    convertPrice(price: string | number, exponent: number): number {
        const priceNum = typeof price === 'string' ? parseInt(price) : price;
        return priceNum * Math.pow(10, exponent);
    }

    swapRateCalculation(solPriceData: any, twozPriceData: any): PriceRate {
        const solUsdPrice = this.convertPrice(solPriceData.price, solPriceData.exponent);
        const solConfidence = this.convertPrice(solPriceData.confidence, solPriceData.exponent);

        const twozUsdPrice = this.convertPrice(twozPriceData.price, twozPriceData.exponent);
        const twozConfidence = this.convertPrice(twozPriceData.confidence, twozPriceData.exponent);

        console.log(`SOL USD Price: ${solUsdPrice} ± ${solConfidence}`);
        console.log(`TWOZ USD Price: ${twozUsdPrice} ± ${twozConfidence}`);

        const twozPerSol = (solUsdPrice - solConfidence) / (twozUsdPrice - twozConfidence);
        console.log(`Rate: ${twozPerSol} TWOZ per 1 SOL`);
        return {
            swapRate: twozPerSol,
            solPriceUsd: (solUsdPrice - solConfidence),
            twozPriceUsd: (twozUsdPrice - twozConfidence),
        }

    }

}
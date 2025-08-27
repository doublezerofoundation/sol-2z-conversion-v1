import ISwapRateService from "./ISwapRateService";
import {PriceRate} from "../../types/common";
const TWOZ_PRECISION = 8;
import {injectable} from "inversify";

@injectable()
export class PythSwapRateService implements ISwapRateService {
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

        const twozPerSol = (solUsdPrice - solConfidence) /  (twozUsdPrice - twozConfidence);
        const roundedTwozPerSol = parseFloat(twozPerSol.toFixed(TWOZ_PRECISION));

        console.log(`Rate: ${roundedTwozPerSol} TWOZ for 1 SOL`);
        return {
            swapRate: roundedTwozPerSol,
            solPriceUsd: (solUsdPrice - solConfidence),
            twozPriceUsd: (twozUsdPrice - twozConfidence),
            last_price_update: new Date().toUTCString()
        }

    }

}
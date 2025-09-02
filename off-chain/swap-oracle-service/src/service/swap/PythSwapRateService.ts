import ISwapRateService from "./ISwapRateService";
import {PriceRate, TWOZ_PRECISION_DECIMALS} from "../../types/common";
import {injectable} from "inversify";

@injectable()
export class PythSwapRateService implements ISwapRateService {
    convertPrice(price: string | number, exponent: number): number {
        const priceNum = typeof price === 'string' ? parseInt(price) : price;
        return priceNum * Math.pow(10, exponent);
    }

    swapRateCalculation(solPriceData: any, twozPriceData: any): PriceRate {
        const solUsdPrice = this.convertPrice(solPriceData.price, solPriceData.exponent);
        const twozUsdPrice = this.convertPrice(twozPriceData.price, twozPriceData.exponent);

        console.log(`SOL USD Price: ${solUsdPrice}`);
        console.log(`TWOZ USD Price: ${twozUsdPrice}`);

        const twozPerSol = solUsdPrice / twozUsdPrice;
        const roundedTwozPerSol = parseFloat(twozPerSol.toFixed(TWOZ_PRECISION_DECIMALS));

        console.log(`Rate: ${roundedTwozPerSol} TWOZ for 1 SOL`);
        return {
            swapRate: roundedTwozPerSol,
            solPriceUsd: solUsdPrice,
            twozPriceUsd: twozUsdPrice,
            last_price_update: new Date().toUTCString()
        }

    }

}
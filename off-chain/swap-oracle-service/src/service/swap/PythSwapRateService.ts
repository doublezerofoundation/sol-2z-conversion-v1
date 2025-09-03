import ISwapRateService from "./ISwapRateService";
import {ConfigField, PriceRate, TWOZ_PRECISION_DECIMALS, TYPES} from "../../types/common";
import {inject, injectable} from "inversify";
import {ConfigUtil} from "../../utils/configUtil";
import {logger} from "../../utils/logger";
import {PriceServiceUnavailableError} from "../../utils/error";

@injectable()
export class PythSwapRateService implements ISwapRateService {
    private MAX_CONFIDENCE_RATIO: number;
    constructor(@inject(TYPES.ConfigUtil) private configUtil: ConfigUtil,) {
        this.MAX_CONFIDENCE_RATIO = this.configUtil.get<any>(ConfigField.MAX_CONFIDENCE_RATIO);
    }

    convertPrice(price: string | number, exponent: number): number {
        const priceNum = typeof price === 'string' ? parseInt(price) : price;
        return priceNum * Math.pow(10, exponent);
    }

    swapRateCalculation(solPriceData: any, twozPriceData: any): PriceRate {
        const solUsdPrice = this.convertPrice(solPriceData.price, solPriceData.exponent);
        const solConfidence = this.convertPrice(solPriceData.confidence, solPriceData.exponent);

        const twozUsdPrice = this.convertPrice(twozPriceData.price, twozPriceData.exponent);
        const twozConfidence = this.convertPrice(twozPriceData.confidence, twozPriceData.exponent);

        const solConfidenceRatio = solConfidence / solUsdPrice;
        const twozConfidenceRatio = twozConfidence / twozUsdPrice;
        const combinedConfidenceRatio = solConfidenceRatio + twozConfidenceRatio;

        logger.debug(`SOL confidence ratio: ${solConfidenceRatio.toFixed(8)}`);
        logger.debug(`TWOZ confidence ratio: ${twozConfidenceRatio.toFixed(8)}`);
        logger.debug(`Combined confidence ratio: ${combinedConfidenceRatio.toFixed(8)}`);
        logger.debug(`Max allowed ratio: ${this.MAX_CONFIDENCE_RATIO}`);

        if (combinedConfidenceRatio > this.MAX_CONFIDENCE_RATIO) {
            logger.error(`Price data confidence check failed. Combined ratio ${combinedConfidenceRatio.toFixed(8)} exceeds maximum ${this.MAX_CONFIDENCE_RATIO}`);
            throw new PriceServiceUnavailableError("Price data confidence check failed. Combined ratio exceeds maximum");
        }

        const twozPerSol = solUsdPrice / twozUsdPrice;
        const roundedTwozPerSol = parseFloat(twozPerSol.toFixed(TWOZ_PRECISION_DECIMALS));
        return {
            swapRate: roundedTwozPerSol,
            solPriceUsd: solUsdPrice,
            twozPriceUsd: twozUsdPrice,
            last_price_update: new Date().toUTCString()
        }

    }

}
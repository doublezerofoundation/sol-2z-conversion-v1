import ISwapRateService from "./ISwapRateService";
import {ConfigField, PriceRate, TWOZ_PRECISION_DECIMALS, TYPES} from "../../types/common";
import {inject, injectable} from "inversify";
import {ConfigUtil} from "../../utils/configUtil";
import {logger} from "../../utils/logger";
import {PriceServiceUnavailableError, PriceStalenessError} from "../../utils/error";

@injectable()
export class PythSwapRateService implements ISwapRateService {
    private MAX_CONFIDENCE_RATIO: number;
    private MAX_PRICE_AGE_SECONDS: number;
    
    constructor(@inject(TYPES.ConfigUtil) private configUtil: ConfigUtil,) {
        this.MAX_CONFIDENCE_RATIO = this.configUtil.get<number>(ConfigField.MAX_CONFIDENCE_RATIO);
        this.MAX_PRICE_AGE_SECONDS = this.configUtil.get<number>(ConfigField.MAX_PRICE_AGE_SECONDS) || 60;
    }

    convertPrice(price: string | number, exponent: number): number {
        const priceNum = typeof price === 'string' ? parseInt(price) : price;
        return priceNum * Math.pow(10, exponent);
    }

    swapRateCalculation(solPriceData: any, twozPriceData: any): PriceRate {
        const nowUnix = Math.floor(Date.now() / 1000);
        
        // Validate SOL/USD publish time (staleness check)
        if (!solPriceData.publishTime) {
            logger.error('SOL price data missing publishTime');
            throw new PriceServiceUnavailableError('SOL price data missing publishTime');
        }
        const solAge = nowUnix - solPriceData.publishTime;
        if (solAge > this.MAX_PRICE_AGE_SECONDS) {
            logger.error('SOL price data is stale', {
                feedId: 'SOL/USD',
                publishTime: solPriceData.publishTime,
                ageSeconds: solAge,
                maxAgeSeconds: this.MAX_PRICE_AGE_SECONDS
            });
            throw new PriceStalenessError(
                `SOL price data is stale (age: ${solAge}s, max: ${this.MAX_PRICE_AGE_SECONDS}s)`,
                'SOL/USD',
                solPriceData.publishTime,
                solAge,
                this.MAX_PRICE_AGE_SECONDS
            );
        }
        if (solAge < -60) {
            logger.error('SOL price data has future timestamp (clock skew)', {
                feedId: 'SOL/USD',
                publishTime: solPriceData.publishTime,
                ageSeconds: solAge,
                maxAgeSeconds: this.MAX_PRICE_AGE_SECONDS
            });
            throw new PriceStalenessError(
                `SOL price data has future timestamp (clock skew: ${-solAge}s)`,
                'SOL/USD',
                solPriceData.publishTime,
                solAge,
                this.MAX_PRICE_AGE_SECONDS
            );
        }
        
        // Validate 2Z/USD publish time (staleness check)
        if (!twozPriceData.publishTime) {
            logger.error('2Z price data missing publishTime');
            throw new PriceServiceUnavailableError('2Z price data missing publishTime');
        }
        const twozAge = nowUnix - twozPriceData.publishTime;
        if (twozAge > this.MAX_PRICE_AGE_SECONDS) {
            logger.error('2Z price data is stale', {
                feedId: '2Z/USD',
                publishTime: twozPriceData.publishTime,
                ageSeconds: twozAge,
                maxAgeSeconds: this.MAX_PRICE_AGE_SECONDS
            });
            throw new PriceStalenessError(
                `2Z price data is stale (age: ${twozAge}s, max: ${this.MAX_PRICE_AGE_SECONDS}s)`,
                '2Z/USD',
                twozPriceData.publishTime,
                twozAge,
                this.MAX_PRICE_AGE_SECONDS
            );
        }
        if (twozAge < -60) {
            logger.error('2Z price data has future timestamp (clock skew)', {
                feedId: '2Z/USD',
                publishTime: twozPriceData.publishTime,
                ageSeconds: twozAge,
                maxAgeSeconds: this.MAX_PRICE_AGE_SECONDS
            });
            throw new PriceStalenessError(
                `2Z price data has future timestamp (clock skew: ${-twozAge}s)`,
                '2Z/USD',
                twozPriceData.publishTime,
                twozAge,
                this.MAX_PRICE_AGE_SECONDS
            );
        }

        logger.debug('Price staleness validation passed', {
            solAge,
            twozAge,
            maxAge: this.MAX_PRICE_AGE_SECONDS
        });

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
        
        // Use the oldest (most conservative) publish time
        const effectivePublishTime = Math.min(solPriceData.publishTime, twozPriceData.publishTime);
        
        return {
            swapRate: roundedTwozPerSol,
            solPriceUsd: solUsdPrice,
            twozPriceUsd: twozUsdPrice,
            last_price_update: new Date().toUTCString(),
            publishTime: effectivePublishTime,
            solPublishTime: solPriceData.publishTime,
            twozPublishTime: twozPriceData.publishTime
        }

    }

}
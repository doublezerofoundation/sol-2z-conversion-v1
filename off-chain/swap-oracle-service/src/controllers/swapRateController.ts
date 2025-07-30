import {Request, Response} from 'express';
import {PricingService} from "../service/pricing/pricingService";
import {PriceRate} from "../types/common";
import {PricingServiceFactory} from "../factory/ServiceFactory";
import {AttestationService} from "../service/attestaion/attestationService";
import {CacheService} from "../service/cache/cacheService";
import {RedisCacheService} from "../service/cache/redisCacheService";

const ENV:string = process.env.ENV || 'dev3';
export default class SwapRateController {
    private priceServices: PricingService[];
    private attestationService: any;
    private redisService: CacheService;

    constructor() {
        this.initializePricingService();
    }

    private initializePricingService(): void {
        this.priceServices = PricingServiceFactory.create();
        this.priceServices.map(priceService => {
            priceService.init();
        })
        this.attestationService = new AttestationService();
        this.redisService = RedisCacheService.getInstance();
    }

    swapRateHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            let priceRate: PriceRate;
            let isCacheHit:boolean
            const cachedSwapRate: PriceRate = await this.redisService.get(`${ENV}-swapRate`)
            if (cachedSwapRate) {
                priceRate = cachedSwapRate;
                isCacheHit = true;
                console.log("cache hit")

            } else {
                const pricePromises = this.priceServices.map(async (priceService) => {
                    return await priceService.retrieveSwapRate();
                });

                const priceRates:PriceRate[] = await Promise.all(pricePromises);
                priceRate = this.selectMostFavorableRate(priceRates);
                await this.redisService.add(`${ENV}-swapRate`, priceRate);
                console.log("cache miss")
                isCacheHit = false;
            }

            const timestamp = Date.now();
            const swapRate = priceRate.swapRate.toString();

            const signedBytes = await this.attestationService.createAttestation({swapRate, timestamp})
            console.log("signedBytes: ", signedBytes)

            console.log(signedBytes)
            const result = {
                swapRate : swapRate.toString(),
                timestamp: timestamp,
                signature: signedBytes,
                solPriceUsd: priceRate.solPriceUsd.toString(),
                twozPriceUsd: priceRate.twozPriceUsd.toString(),
                cacheHit: isCacheHit,

            }
            // TODO Audit log the Price
            res.json(result);
        } catch (error) {
            console.error('Error in priceRateHandler:', error);
            res.status(500).json({error: 'Internal server error'});
        }
    }

    private selectMostFavorableRate(priceRates: PriceRate[]): PriceRate {
        if (priceRates.length === 0) {
            throw new Error('No price rates available');
        }

        return priceRates.reduce((bestRate, currentRate) =>
            currentRate.swapRate > bestRate.swapRate ? currentRate : bestRate
        );
    }


}

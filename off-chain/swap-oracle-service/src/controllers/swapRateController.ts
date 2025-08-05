import {Request, Response} from 'express';
import {PricingService} from "../service/pricing/pricingService";
import {HealthCheckResult, PriceRate} from "../types/common";
import {PricingServiceFactory} from "../factory/ServiceFactory";
import {AttestationService} from "../service/attestaion/attestationService";
import {CacheService} from "../service/cache/cacheService";
import {RedisCacheService} from "../service/cache/redisCacheService";
import MonitoringService from "../service/monitor/monitoringService";
import CloudWatchMonitoringService from "../service/monitor/cloudWatchMonitoringService";

const ENV:string = process.env.ENV || 'dev';
export default class SwapRateController {
    private priceServices: PricingService[];
    private attestationService: any;
    private redisService: CacheService;
    private monitoringService: MonitoringService;

    constructor() {
        this.initializePricingService();
    }

    private initializePricingService(): void {
        this.priceServices = PricingServiceFactory.create();
        this.priceServices.map(priceService => {
            priceService.init();
        })
        this.attestationService = new AttestationService();
        this.monitoringService = new CloudWatchMonitoringService()
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

            } else {
                const pricePromises = this.priceServices.map(async (priceService) => {
                    return await priceService.retrieveSwapRate();
                });

                const priceRates:PriceRate[] = await Promise.all(pricePromises);
                priceRate = this.selectMostFavorableRate(priceRates);
                await this.monitoringService.putMonitoringData("2Z/Sol-price-rate",priceRate.swapRate)

                await this.redisService.add(`${ENV}-swapRate`, priceRate,true);
                isCacheHit = false;
            }

            const timestamp = Math.floor(Date.now() / 1000);
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
            console.log("Result",result)
            res.json(result);
        } catch (error) {
            console.error('Error in priceRateHandler:', error);
            res.status(500).json({error: 'Internal server error'});
        }
    }


    healthCheckHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const HealthCheckPromise:Promise<HealthCheckResult>[] = this.priceServices.map(async (priceService:PricingService) => {
                return await priceService.getHealth()
            })
            const HealthChecks:HealthCheckResult[] = await Promise.all(HealthCheckPromise)
            res.json(HealthChecks);
        } catch (error) {
            console.error('Error in healthCheckHandler:', error);
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

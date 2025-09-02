import {Request, Response} from 'express';
import {IPricingService} from "../service/pricing/IPricingService";
import {HealthCheckResult, PriceRate, TWOZ_PRECISION, TYPES} from "../types/common";
import {PricingServiceFactory} from "../factory/serviceFactory";
import {AttestationService} from "../service/attestation/attestationService";
import {CacheService} from "../service/cache/cacheService";
import IMetricsMonitoringService from "../service/monitor/IMetricsMonitoringService";
import {HealthMonitoringService} from "../service/monitor/healthMonitoringService";
import {inject, injectable} from "inversify";
import {CircuitBreakerService} from "../service/monitor/circuitBreakerService";
import {logger} from "../utils/logger";

const ENV:string = process.env.ENVIRONMENT || 'dev';
@injectable()
export default class SwapRateController {
    private priceServices: IPricingService[];

    constructor(
        @inject(TYPES.PricingServiceFactory) private pricingServiceFactory: PricingServiceFactory,
        @inject(TYPES.AttestationService) private attestationService: AttestationService,
        @inject(TYPES.CacheService) private cacheService: CacheService,
        @inject(TYPES.MetricsMonitoringService) private metricsMonitoringService: IMetricsMonitoringService,
        @inject(TYPES.HealthMonitoringService) private healthMonitoringService: HealthMonitoringService,
        @inject(TYPES.CircuitBreakerService) private circuitBreakerService: CircuitBreakerService,

    ) {
        this.initializePricingService();
    }

    private initializePricingService(): void {
        this.priceServices = this.pricingServiceFactory.create();
        this.priceServices.map(priceService => {
            priceService.init();
        })
    }

    swapRateHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!await this.healthMonitoringService.getHealthStatus()) {
                logger.error("Health check failed")
                res.status(503).json({
                    error: 'Service temporarily unavailable',
                    details: 'Health check failed',
                    circuitBreakerStats: this.circuitBreakerService.getStats()
                });
                return;
            }

            const { priceRate, isCacheHit } = await this.getSwapRate();
            const timestamp = Math.floor(Date.now() / 1000);
            const swapRate = priceRate.swapRate * TWOZ_PRECISION

            const signedBytes = await this.attestationService.createAttestation({swapRate, timestamp})
            const result = {
                swapRate : swapRate,
                timestamp: timestamp,
                signature: signedBytes,
                solPriceUsd: priceRate.solPriceUsd.toString(),
                twozPriceUsd: priceRate.twozPriceUsd.toString(),
                cacheHit: isCacheHit,

            }
            res.json(result);
        } catch (error) {
            logger.error('Error in priceRateHandler:', error);
            res.status(500).json({error: 'Internal server error'});
        }
    }


    healthCheckHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const healthChecks: HealthCheckResult[] = await this.healthMonitoringService.getHealthMonitoringData();
            const circuitBreakerStats = this.circuitBreakerService.getStats();
            const overallHealthy = await this.healthMonitoringService.getHealthStatus();

            res.json({
                healthy: overallHealthy,
                healthChecks: healthChecks,
                circuitBreaker: circuitBreakerStats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error in healthCheckHandler:', error);
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

    private async getSwapRate(): Promise<{ priceRate: PriceRate; isCacheHit: boolean }> {
        const cachedSwapRate: PriceRate = await this.cacheService.get(`${ENV}-swapRate`);

        if (cachedSwapRate) {
            return { priceRate: cachedSwapRate, isCacheHit: true };
        }
        try {
            const pricePromises = this.priceServices.map(async (service) => {
                try {
                    const result = await service.retrieveSwapRate();
                    return { success: true, data: result, service: service.getPricingServiceType() };
                } catch (error) {
                    logger.error(`Error from ${service.getPricingServiceType()}:`, error);
                    return { success: false, error, service: service.getPricingServiceType() };
                }
            });

            const results = await Promise.allSettled(pricePromises);
            const successfulRates: PriceRate[] = [];
            const failures: string[] = [];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value.success && result.value.data) {
                    successfulRates.push(result.value.data);
                } else {
                    const serviceName = this.priceServices[index]?.getPricingServiceType() || `service-${index}`;
                    failures.push(serviceName);
                }
            });

            logger.info(`Successful rates: ${successfulRates.length}, Failures: ${failures.length}`);

            if (successfulRates.length === 0) {
                throw new Error(`All pricing services failed. Failed services: ${failures.join(', ')}`);
            }

            const priceRate = this.selectMostFavorableRate(successfulRates);


            await this.metricsMonitoringService.putMonitoringData("2Z/Sol-price-rate", priceRate.swapRate);
            await this.cacheService.add(`${ENV}-swapRate`, priceRate, true);

            return { priceRate, isCacheHit: false };
        } catch (error) {
            logger.error('Error retrieving swap rate:', error);
            this.circuitBreakerService.reportPriceRetrievalFailure();
            throw error;
        }


    }



}

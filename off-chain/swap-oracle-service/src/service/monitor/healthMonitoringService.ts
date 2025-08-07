import {PricingService} from "../pricing/pricingService";
import {HealthCheckResult, HealthStatus, TYPES} from "../../types/common";
import {PricingServiceFactory} from "../../factory/serviceFactory";
import { injectable, inject } from 'inversify';
import {CircuitBreakerService} from "./circuitBreakerService";


@injectable()
export class HealthMonitoringService {
    private pricingServices: PricingService[]
    private monitoringData: HealthCheckResult[] = []

    constructor(
        @inject(TYPES.PricingServiceFactory) private pricingServiceFactory: PricingServiceFactory,
        @inject(TYPES.CircuitBreakerService) private circuitBreakerService: CircuitBreakerService
    ) {
        this.initializePricingServices();
    }

    private initializePricingServices(): void {
        try {
            this.pricingServices = this.pricingServiceFactory.create();
            this.pricingServices.forEach(priceService => {
                priceService.init();
            });
            console.log(`Initialized ${this.pricingServices.length} pricing services for health monitoring`);
        } catch (error) {
            console.error('Failed to initialize pricing services for health monitoring:', error);
            this.pricingServices = [];
        }
    }


    async startMonitoring(): Promise<void> {
        const pricePromises = this.pricingServices.map(async (priceService) => {
            return await priceService.getHealth();
        });

        console.log("Price data requested")
        this.monitoringData = await Promise.all(pricePromises);
        console.log(this.monitoringData)
        const hasUnhealthy = this.monitoringData.some(healthCheck =>
            healthCheck.status === HealthStatus.UN_HEALTHY);

        if (hasUnhealthy) {
            this.circuitBreakerService.reportHealthCheckFailure();
        } else {
            this.circuitBreakerService.reportHealthCheckSuccess();
        }

    }

    async getHealthMonitoringData(): Promise<HealthCheckResult[]> {
        return this.monitoringData;
    }

    async getHealthStatus(): Promise<boolean> {
        console.log(this.monitoringData)
        if(!this.circuitBreakerService.canExecute()){
            console.log('Circuit breaker is open, health status is false');
            return false;
        }
        return  this.monitoringData.some(healthCheck => healthCheck.status === HealthStatus.HEALTHY);
    }
}
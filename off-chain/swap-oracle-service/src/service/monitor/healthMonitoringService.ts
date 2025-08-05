import {PricingService} from "../pricing/pricingService";
import {HealthCheckResult, HealthStatus} from "../../types/common";
import {PricingServiceFactory} from "../../factory/ServiceFactory";

export class HealthMonitoringService {
    private pricingServices: PricingService[]
    private monitoringData: HealthCheckResult[]
    private static instance: HealthMonitoringService;

    public static getInstance(): HealthMonitoringService {
        if (!HealthMonitoringService.instance) {
            HealthMonitoringService.instance = new HealthMonitoringService();
        }
        return HealthMonitoringService.instance;
    }
    private constructor(){
        this.pricingServices = PricingServiceFactory.create();
        this.pricingServices.map(priceService => {
            priceService.init();
        })
    }

    async startMonitoring(): Promise<void> {
        const pricePromises = this.pricingServices.map(async (priceService) => {
            return await priceService.getHealth();
        });

        console.log("Price data requested")
        this.monitoringData = await Promise.all(pricePromises);
        console.log(this.monitoringData)
    }

    async getHealthMonitoringData(): Promise<HealthCheckResult[]> {
        return this.monitoringData;
    }

    async getHealthStatus(): Promise<boolean> {
        console.log(this.monitoringData)
         return  this.monitoringData.some(healthCheck => healthCheck.status === HealthStatus.HEALTHY);
    }
}
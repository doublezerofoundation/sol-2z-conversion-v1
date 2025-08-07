import SwapRateService from "../swap/swapRateService";
import {HealthCheckResult, PriceRate, PricingServicesConfig} from "../../types/common";

export  interface PricingService {
    init(): void;
    getPricingServiceType(): string;
    fetchPrice(feedID: string): Promise<any>;
    swapRateCal(solPriceData: any, twozPriceData: any):  Promise<any>;
    retrieveSwapRate():  Promise<PriceRate>;
    getHealth(): Promise<HealthCheckResult>;
}

export abstract class PricingServiceBase implements PricingService {
    public pricingServicesConfig: PricingServicesConfig;
    public swapRateService: SwapRateService;

    async swapRateCal(solPriceData: any, twozPriceData: any): Promise<PriceRate> {
        return this.swapRateService.swapRateCalculation(solPriceData, twozPriceData);
    }
    getPricingServiceType(): string {
        return this.pricingServicesConfig.type;
    }
    abstract init(): void;
    abstract fetchPrice(feedID: string): Promise<any>;
    abstract retrieveSwapRate():  Promise<any>;
    abstract getHealth(): Promise<HealthCheckResult>;
}
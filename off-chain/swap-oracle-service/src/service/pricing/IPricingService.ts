import ISwapRateService from "../swap/ISwapRateService";
import {HealthCheckResult, PriceRate, PricingServicesConfig} from "../../types/common";

export  interface IPricingService {
    init(): void;
    getPricingServiceType(): string;
    fetchPrice(feedID: string): Promise<any>;
    swapRateCal(solPriceData: any, twozPriceData: any):  Promise<any>;
    retrieveSwapRate():  Promise<PriceRate>;
    getHealth(): Promise<HealthCheckResult>;
}

export abstract class PricingServiceBase implements IPricingService {
    public pricingServicesConfig: PricingServicesConfig;
    public swapRateService: ISwapRateService;

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
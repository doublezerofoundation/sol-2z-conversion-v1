import SwapRateService from "../swap/swapRateService";
import {PriceRate, PricingServicesConfig} from "../../types/common";

export  interface PricingService {
    init(): void;
    fetchPrice(feedID: string): Promise<any>;
    swapRateCal(solPriceData: any, twozPriceData: any):  Promise<any>;
    retrieveSwapRate():  Promise<PriceRate>;
}

export abstract class PricingServiceBase implements PricingService {
    public pricingServicesConfig: PricingServicesConfig;
    public swapRateService: SwapRateService;

    async swapRateCal(solPriceData: any, twozPriceData: any): Promise<PriceRate> {
        return this.swapRateService.swapRateCalculation(solPriceData, twozPriceData);
    }
    abstract init(): void;
    abstract fetchPrice(feedID: string): Promise<any>;
    abstract retrieveSwapRate():  Promise<any>;
}
import {Request, Response} from 'express';
import {PricingService} from "../service/pricing/pricingService";
import {PriceRate, SwapRateResponce} from "../types/common";
import {PricingServiceFactory} from "../factory/ServiceFactory";
import {AttestationService} from "../service/attestaion/attestationService";


export default class SwapRateController {
    private priceServices: PricingService[];
    private attestationService: any;

    constructor() {
        this.initializePricingService();
    }

    private initializePricingService(): void {
        this.priceServices = PricingServiceFactory.create();
        this.priceServices.map(priceService => {
            priceService.init();
        })
        this.attestationService = new AttestationService();
    }

    swapRateHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const pricePromises = this.priceServices.map(async (priceService) => {
                return await priceService.retrieveSwapRate();
            });

            const priceRates:PriceRate[] = await Promise.all(pricePromises);
            const priceRate = this.selectMostFavorableRate(priceRates);
            const timestamp = Date.now();
            const swapRate = priceRate.swapRate.toString();

            const signedBytes = await this.attestationService.createAttestation({swapRate, timestamp})

            console.log(signedBytes)
            const result = {
                swapRate : swapRate,
                timestamp: timestamp,
                signature: signedBytes,
                solPriceUsd: priceRate.solPriceUsd,
                twozPriceUsd: priceRate.twozPriceUsd,
                cacheHit: false

            }
            // TODO cache the price
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

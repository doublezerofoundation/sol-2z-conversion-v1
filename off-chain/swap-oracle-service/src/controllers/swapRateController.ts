import { Request, Response } from 'express';
import PricingService from "../service/pricing/pricingService";
import {configUtil} from "../utils/configUtil";
import {ConfigField, PriceFeed, PricingServiceType} from "../types/common";
import {PricingServiceFactory} from "../factory/ServiceFactory";

export default  class SwapRateController {
    private priceService: PricingService;
    constructor() {
        this.initializePricingService();
    }

    private initializePricingService(serviceType?: PricingServiceType): void {
        this.priceService = PricingServiceFactory.create(serviceType);
        this.priceService.init();
    }

    swapRateHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const priceFeedIds = configUtil.get<any>(ConfigField.PRICE_FEED_ID);
            const solUsdFeedID = priceFeedIds[PriceFeed.SOL_USD];
            const twozUsdFeedID = priceFeedIds[PriceFeed.TWOZ_USD];

            if (!solUsdFeedID || !twozUsdFeedID) {
                res.status(404).json({ error: 'Feed ID not configured' });
                return;
            }

            const solPrice = await this.priceService.fetchPrice(solUsdFeedID);
            const twozPrice = await this.priceService.fetchPrice(twozUsdFeedID);

            console.log("Sol Price: ", solPrice)
            console.log("Twoz Price: ", twozPrice)
            // TODO cache the price
            // Audit log the Price
            // Calculate SWAP RATE
            // SIGN the data
            res.json(solPrice);
        } catch (error) {
            console.error('Error in priceRateHandler:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

}

export default interface PricingService {
    init(): void;
    fetchPrice(feedID: string): Promise<any>;
    convert(): number;
}
import {PriceRate} from "../../types/common";

export default interface SwapRateService {
    convertPrice(price: string | number, exponent: number):  number;
    swapRateCalculation(solPriceData: any, twozPriceData: any):  PriceRate;
}
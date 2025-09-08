import {PriceRate} from "../../types/common";

export default interface ISwapRateService {
    convertPrice(price: string | number, exponent: number):  number;
    swapRateCalculation(solPriceData: any, twozPriceData: any):  PriceRate;
}
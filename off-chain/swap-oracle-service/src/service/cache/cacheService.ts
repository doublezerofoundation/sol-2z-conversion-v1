export interface CacheService {
    add(key: string, value: any,isTTL:boolean):any
    get(key: string):any
}
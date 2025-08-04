export interface CacheService {
    add(key: string, value: any):any
    get(key: string):any
}
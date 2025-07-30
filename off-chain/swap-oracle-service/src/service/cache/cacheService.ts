export interface CacheService {
    add(key: string, value: any):any
    remove(key: string):any
    get(key: string):any
}
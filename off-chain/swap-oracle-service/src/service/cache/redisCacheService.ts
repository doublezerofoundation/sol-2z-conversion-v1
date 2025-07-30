import {CacheService} from "./cacheService";
import { createClient } from "redis";
const REDIS_URL = process.env.REDIS_URL;
export class RedisCacheService implements CacheService {
    private redisClient: any;
    static instance: RedisCacheService;
    private constructor() {
        this.redisClient = createClient({
            url: REDIS_URL,

        });
    }
    static getInstance(): CacheService {
        if(!RedisCacheService.instance) {
            RedisCacheService.instance = new RedisCacheService();
        }
        return RedisCacheService.instance as CacheService;
    }
    add(key: string, value: any): any {
        this.redisClient.set(key, value ,{
            EX: 60 * 60 * 24 * 30,
            NX: true,
        });
    }

    get(key: string): any {
        this.redisClient.get(key);
    }
    remove(key: string): any {
        this.redisClient.del(key);
    }

}
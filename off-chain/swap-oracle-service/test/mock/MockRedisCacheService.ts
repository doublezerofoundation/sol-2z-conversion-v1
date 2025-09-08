import {CacheService} from "../../src/service/cache/cacheService";


export class MockRedisCacheService implements CacheService {
    private data: Map<string, any> = new Map();
    add(key: string, value: any, isTTL: boolean): any {
        this.data.set(key, value);
    }

    get(key: string): any {
        return this.data.get(key);
    }

}
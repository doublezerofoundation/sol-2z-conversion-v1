import {CacheService} from "./cacheService";
import { createClient, RedisClientType } from "redis";
import process from "node:process";
import {inject, injectable} from "inversify";
import {ConfigUtil} from "../../utils/configUtil";
import {ConfigField, TYPES} from "../../types/common";
import {logger} from "../../utils/logger";
const REDIS_ENDPOINT = process.env.REDIS_ENDPOINT
const REDIS_PORT =  process.env.REDIS_PORT
const REDIS_URL = `rediss://${REDIS_ENDPOINT}:${REDIS_PORT}`
@injectable()
export class RedisCacheService implements CacheService {
    private redisClient: RedisClientType;
    private isConnected: boolean = false;


    constructor(@inject(TYPES.ConfigUtil) private configUtil: ConfigUtil) {
        this.redisClient = createClient({
            url: REDIS_URL,
        });
        logger.debug("redis derived url",REDIS_URL)
        this.redisClient.on("error", (err) => {
            logger.error("Redis Client Error", err);
            this.isConnected = false;
        });

        this.redisClient.on("connect", () => {
            logger.error("Redis client connected");
            this.isConnected = true;
        });

        this.redisClient.on("disconnect", () => {
            logger.error("Redis client disconnected");
            this.isConnected = false;
        });
        logger.info("Redis client configured (not connected yet)");
    }


    private async connect(): Promise<void> {
        try {
            logger.info("Connecting to Redis...");
            await this.redisClient.connect();
        } catch (error) {
            logger.error("Failed to connect to Redis:", error);
        }
    }

    private async ensureConnection(): Promise<void> {
        if (!this.isConnected) {
            try {
                await this.connect();
            } catch (error) {
                throw new Error(`Redis connection failed: ${error}`);
            }
        }
    }

    private getCacheTTL(): number {
        try {
            return this.configUtil.get<number>(ConfigField.PRICE_CACHE_TTL_SECONDS) || 10; // 10
        } catch (error) {
            logger.warn("Failed to get TTL from config, using default:", error);
            return 10; // fallback
        }
    }

    async add(key: string, value: any,isTTL:boolean): Promise<any> {
        try {
            await this.ensureConnection();
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            if(isTTL) {
                return await this.redisClient.set(key, stringValue, {
                    EX: this.getCacheTTL(),
                });
            }
            await this.redisClient.set(key, stringValue);
        } catch (error) {
            logger.error(`Error adding key ${key}:`, error);
            return null;
        }
    }

    async get(key: string): Promise<any> {
        try {
            await this.ensureConnection();
            const value: string | {} = await this.redisClient.get(key);
            logger.info("value from redis",value)
            if (value === null) return null;
            try {
                return JSON.parse(value as string);
            } catch {
                return value;
            }
        } catch (error) {
            logger.error(`Error getting key ${key}:`, error);
            return null;
        }
    }
}
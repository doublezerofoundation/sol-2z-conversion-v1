import {CacheService} from "./cacheService";
import { createClient, RedisClientType } from "redis";
import process from "node:process";
const REDIS_ENDPOINT = process.env.REDIS_ENDPOINT
const REDIS_PORT =  process.env.REDIS_PORT
const REDIS_URL = `rediss://${REDIS_ENDPOINT}:${REDIS_PORT}`
const TTL_SECONDS = 10
import {injectable} from "inversify";

@injectable()
export class RedisCacheService implements CacheService {
    private redisClient: RedisClientType;
    private isConnected: boolean = false;


    constructor() {
        this.redisClient = createClient({
            url: REDIS_URL,
        });
        console.log("redis derived url",REDIS_URL)
        this.redisClient.on("error", (err) => {
            console.error("Redis Client Error", err);
            this.isConnected = false;
        });

        this.redisClient.on("connect", () => {
            console.log("Redis client connected");
            this.isConnected = true;
        });

        this.redisClient.on("disconnect", () => {
            console.log("Redis client disconnected");
            this.isConnected = false;
        });
        console.log("Redis client configured (not connected yet)");


    }


    private async connect(): Promise<void> {
        try {
            console.log("Connecting to Redis...");
            await this.redisClient.connect();
        } catch (error) {
            console.error("Failed to connect to Redis:", error);
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

    async add(key: string, value: any,isTTL:boolean): Promise<any> {
        try {
            await this.ensureConnection();
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            if(isTTL) {
                return await this.redisClient.set(key, stringValue, {
                    EX: TTL_SECONDS,
                });
            }
            await this.redisClient.set(key, stringValue);
        } catch (error) {
            console.error(`Error adding key ${key}:`, error);
            return null;
        }
    }

    async get(key: string): Promise<any> {
        try {
            await this.ensureConnection();
            const value: string | {} = await this.redisClient.get(key);
            console.log("value from redis",value)
            if (value === null) return null;
            try {
                return JSON.parse(value as string);
            } catch {
                return value;
            }
        } catch (error) {
            console.error(`Error getting key ${key}:`, error);
            return null;
        }
    }
}
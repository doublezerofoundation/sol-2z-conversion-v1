import config from 'config';
import { LogLevel } from "./logger";
import { ConfigField } from "../common";

export class ConfigUtil {
     private static instance: ConfigUtil;
     private config: typeof config;

     private constructor() {
          this.config = config;
     }

     public static getInstance(): ConfigUtil {
          if (!ConfigUtil.instance) {
               ConfigUtil.instance = new ConfigUtil();
          }
          return ConfigUtil.instance;
     }

     public get<T>(key: string): T {
          return this.config.get<T>(key);
     }

     public has(key: string): boolean {
          return this.config.has(key);
     }

     public getLogLevel(): LogLevel {
          const logLevelStr = this.get<string>(ConfigField.LOG_LEVEL) || process.env.LOG_LEVEL || 'INFO';
          switch (logLevelStr.toUpperCase()) {
               case 'ERROR': return LogLevel.ERROR;
               case 'WARN': return LogLevel.WARN;
               case 'INFO': return LogLevel.INFO;
               case 'DEBUG': return LogLevel.DEBUG;
               default: return LogLevel.INFO;
          }
     }

     public getRpcUrl(): string {
          return this.get<string>(ConfigField.RPC_URL);
     }

     public getProgramId(): string {
          return this.get<string>(ConfigField.PROGRAM_ID);
     }

     public getApplicationPort(): number {
          return this.get<number>(ConfigField.APPLICATION_PORT);
     }

     public getConcurrency(): number {
          return this.get<number>(ConfigField.CONCURRENCY);
     }

     public getEnvironment(): string {
          return process.env.ENVIRONMENT || "default_env";
     }
}

export const configUtil = ConfigUtil.getInstance();

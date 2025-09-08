// Mock for: src/utils/configUtil.ts
import { LogLevel } from '../../src/utils/logger';

const mockConfig = {
  applicationPort: 8080,
  rpcUrl: 'http://localhost:8899',
  programId: '11111111111111111111111111111111',
  concurrency: 4,
  logLevel: 'INFO'
};

export class ConfigUtil {
    private static instance: ConfigUtil;

    public static getInstance(): ConfigUtil {
        if (!ConfigUtil.instance) {
            ConfigUtil.instance = new ConfigUtil();
        }
        return ConfigUtil.instance;
    }

    public get<T>(key: string): T {
        return (mockConfig as any)[key] as T;
    }

    public has(key: string): boolean {
        return key in mockConfig;
    }

    public getLogLevel(): LogLevel {
        return LogLevel.INFO;
    }

    public getRpcUrl(): string {
        return mockConfig.rpcUrl;
    }

    public getProgramId(): string {
        return mockConfig.programId;
    }

    public getApplicationPort(): number {
        return mockConfig.applicationPort;
    }

    public getConcurrency(): number {
        return mockConfig.concurrency;
    }

    public getEnvironment(): string {
        return 'test';
    }
}

export const configUtil = ConfigUtil.getInstance();

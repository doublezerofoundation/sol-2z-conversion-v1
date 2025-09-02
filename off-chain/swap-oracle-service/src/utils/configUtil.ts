import config from 'config';
import { LogLevel } from "./logger";

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

}

export function getLogLevel(): LogLevel {
    const logLevelStr = ConfigUtil.getInstance().get<string>("LOG_LEVEL")|| 'INFO';
    switch (logLevelStr.toUpperCase()) {
        case 'ERROR': return LogLevel.ERROR;
        case 'WARN': return LogLevel.WARN;
        case 'INFO': return LogLevel.INFO;
        case 'DEBUG': return LogLevel.DEBUG;
        default: return LogLevel.INFO;
    }
}


export const configUtil = ConfigUtil.getInstance();
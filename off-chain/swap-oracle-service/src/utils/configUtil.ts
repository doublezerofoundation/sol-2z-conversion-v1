import config from 'config';

export interface AppConfig {
    applicationPort: number;
}

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

    public getAll(): AppConfig {
        return {
            applicationPort: this.get<number>('applicationPort')
        };
    }
}

export const configUtil = ConfigUtil.getInstance();
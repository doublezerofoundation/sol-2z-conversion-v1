import config from 'config';

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

export const configUtil = ConfigUtil.getInstance();
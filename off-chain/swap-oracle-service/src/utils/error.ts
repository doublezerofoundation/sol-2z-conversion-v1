export class PriceServiceError extends Error {
    constructor(message: string, public readonly feedId?: string, public readonly originalError?: Error) {
        super(message);
        this.name = 'PriceServiceError';
    }
}

export class ConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigurationError';
    }
}

export class PriceServiceUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PriceServiceUnavailableError';
    }
}

export class PriceStalenessError extends PriceServiceUnavailableError {
    constructor(
        message: string,
        public readonly feedId: string,
        public readonly publishTime: number,
        public readonly ageSeconds: number,
        public readonly maxAgeSeconds: number
    ) {
        super(message);
        this.name = 'PriceStalenessError';
    }
}
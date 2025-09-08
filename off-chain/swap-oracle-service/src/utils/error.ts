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
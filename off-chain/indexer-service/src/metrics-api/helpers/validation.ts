import { APIGatewayProxyEvent } from 'aws-lambda';

export interface ValidatedRequest {
    from: string;
    to: string;
    fromTimestamp: number;
    toTimestamp: number;
}

export interface ValidationError {
    code: string;
    message: string;
    statusCode: number;
}

/**
 * Validate API key from request headers
 */
export function validateApiKey(headers: Record<string, string | undefined>): ValidationError | null {
    const apiKey = headers['X-API-Key'] || headers['x-api-key'];
    if (!apiKey) {
        return {
            code: 'UNAUTHORIZED',
            message: 'API Key required',
            statusCode: 401
        };
    }
    
    // TODO: Validate API key against your key store
    // if (!await validateApiKey(apiKey)) {
    //     return { code: 'INVALID_API_KEY', message: 'Invalid API key', statusCode: 401 };
    // }
    
    return null;
}

/**
 * Validate and parse date range parameters
 */
export function validateDateRange(queryStringParameters: { [key: string]: string | undefined } | null): ValidatedRequest | ValidationError {
    const { from, to } = queryStringParameters || {};
    
    if (!from || !to) {
        return {
            code: 'INVALID_PARAMETERS',
            message: 'Both from and to parameters are required',
            statusCode: 400
        };
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from) || !dateRegex.test(to)) {
        return {
            code: 'INVALID_DATE_FORMAT',
            message: 'Date parameters must be in YYYY-MM-DD format',
            statusCode: 400
        };
    }
    
    // Convert date strings to timestamps (in seconds, as stored in DDB)
    const fromTimestamp = Math.floor(new Date(`${from}T00:00:00Z`).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(`${to}T23:59:59Z`).getTime() / 1000);
    
    return {
        from,
        to,
        fromTimestamp,
        toTimestamp
    };
}

/**
 * Check if a value is a validation error
 */
export function isValidationError(value: any): value is ValidationError {
    return value && typeof value === 'object' && 'code' in value && 'message' in value && 'statusCode' in value;
}

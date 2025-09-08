"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDateRange = validateDateRange;
exports.isValidationError = isValidationError;
/**
 * Validate and parse date range parameters
 */
function validateDateRange(queryStringParameters) {
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
function isValidationError(value) {
    return value && typeof value === 'object' && 'code' in value && 'message' in value && 'statusCode' in value;
}

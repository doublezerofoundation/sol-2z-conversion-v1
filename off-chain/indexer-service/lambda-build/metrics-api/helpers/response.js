"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResponse = createResponse;
exports.createErrorResponse = createErrorResponse;
exports.createSuccessResponse = createSuccessResponse;
/**
 * Create a properly formatted API Gateway response
 */
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}
/**
 * Create an error response
 */
function createErrorResponse(statusCode, code, message) {
    return createResponse(statusCode, { code, message });
}
/**
 * Create a success response with data
 */
function createSuccessResponse(data) {
    return createResponse(200, data);
}

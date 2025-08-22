import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Create a properly formatted API Gateway response
 */
export function createResponse(statusCode: number, body: any): APIGatewayProxyResult {
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
export function createErrorResponse(statusCode: number, code: string, message: string): APIGatewayProxyResult {
    return createResponse(statusCode, { code, message });
}

/**
 * Create a success response with data
 */
export function createSuccessResponse(data: any): APIGatewayProxyResult {
    return createResponse(200, data);
}

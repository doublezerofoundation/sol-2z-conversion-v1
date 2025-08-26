import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { validateDateRange, isValidationError } from './helpers/validation';
import { createErrorResponse } from './helpers/response';
import { handleBuysMetrics } from './handlers/buys';
import { handleErrorsMetrics } from './handlers/errors';
import { handleDequeuesMetrics } from './handlers/dequeues';

/**
 * Lambda function to handle metrics API requests
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        const { httpMethod, resource, queryStringParameters } = event;
        
        // Validate date range parameters  
        const validatedRequest = validateDateRange(queryStringParameters);
        if (isValidationError(validatedRequest)) {
            return createErrorResponse(validatedRequest.statusCode, validatedRequest.code, validatedRequest.message);
        }
        
        // Route to appropriate handler based on resource path
        if (httpMethod === 'GET') {
            if (resource.endsWith('/buys')) {
                return await handleBuysMetrics(validatedRequest);
            } else if (resource.endsWith('/errors')) {
                return await handleErrorsMetrics(validatedRequest);
            } else if (resource.endsWith('/dequeues')) {
                return await handleDequeuesMetrics(validatedRequest);
            }
        }
        
        return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found');
        
    } catch (error) {
        console.error('Error processing request:', error);
        return createErrorResponse(500, 'INTERNAL_SERVER_ERROR', 'An internal error occurred');
    }
};

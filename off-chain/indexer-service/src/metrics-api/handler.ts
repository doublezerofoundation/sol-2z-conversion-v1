import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Lambda function to handle metrics API requests
 */

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        const { httpMethod, resource, queryStringParameters, headers } = event;
        
        // Validate API Key
        const apiKey = headers['X-API-Key'] || headers['x-api-key'];
        if (!apiKey) {
            return createResponse(401, { 
                code: 'UNAUTHORIZED', 
                message: 'API Key required' 
            });
        }
        
        // TODO: Validate API key against your key store
        // if (!await validateApiKey(apiKey)) {
        //     return createResponse(401, { code: 'INVALID_API_KEY', message: 'Invalid API key' });
        // }
        
        // Extract and validate query parameters
        const { from, to } = queryStringParameters || {};
        if (!from || !to) {
            return createResponse(400, { 
                code: 'INVALID_PARAMETERS', 
                message: 'Both from and to parameters are required' 
            });
        }
        
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(from) || !dateRegex.test(to)) {
            return createResponse(400, { 
                code: 'INVALID_DATE_FORMAT', 
                message: 'Date parameters must be in YYYY-MM-DD format' 
            });
        }
        
        // Route to appropriate handler based on resource path
        if (httpMethod === 'GET') {
            if (resource.endsWith('/metrics/buys')) {
                return await handleBuysMetrics(from, to);
            } else if (resource.endsWith('/metrics/errors')) {
                return await handleErrorsMetrics(from, to);
            } else if (resource.endsWith('/metrics/dequeues')) {
                return await handleDequeuesMetrics(from, to);
            }
        }
        
        return createResponse(404, { 
            code: 'NOT_FOUND', 
            message: 'Endpoint not found' 
        });
        
    } catch (error) {
        console.error('Error processing request:', error);
        return createResponse(500, { 
            code: 'INTERNAL_SERVER_ERROR', 
            message: 'An internal error occurred' 
        });
    }
};

/**
 * Handle buys metrics endpoint
 */
async function handleBuysMetrics(from: string, to: string): Promise<APIGatewayProxyResult> {
    try {
        // TODO: Implement with existing indexer database connection
        // const buysData = await indexerDatabase.getBuyEvents(from, to);
        // Mock response for now
        const mockData = {
            from,
            to,
            data: [
                {
                    bucket: from,
                    start: `${from}T00:00:00Z`,
                    end: `${addDays(from, 1)}T00:00:00Z`,
                    buys: 19
                }
            ]
        };
        
        return createResponse(200, mockData);
    } catch (error) {
        console.error('Error in handleBuysMetrics:', error);
        throw error;
    }
}

/**
 * Handle errors metrics endpoint
 */
async function handleErrorsMetrics(from: string, to: string): Promise<APIGatewayProxyResult> {
    try {
        // TODO: Implement with existing indexer database connection
        const mockData = {
            from,
            to,
            data: [
                {
                    bucket: from,
                    start: `${from}T00:00:00Z`,
                    end: `${addDays(from, 1)}T00:00:00Z`,
                    errors: 4,
                    errorsByCode: {
                        "BidTooLow": 3,
                        "InvalidAttestation": 1
                    }
                }
            ]
        };
        
        return createResponse(200, mockData);
    } catch (error) {
        console.error('Error in handleErrorsMetrics:', error);
        throw error;
    }
}

/**
 * Handle dequeues metrics endpoint
 */
async function handleDequeuesMetrics(from: string, to: string): Promise<APIGatewayProxyResult> {
    try {
        // TODO: Implement with existing indexer database connection
        const mockData = {
            from,
            to,
            data: [
                {
                    bucket: from,
                    start: `${from}T00:00:00Z`,
                    end: `${addDays(from, 1)}T00:00:00Z`,
                    count: 5,
                    solDequeuedTotal: "12.500000000",
                    solDequeuedAvg: "2.500000000",
                    solDequeuedP95: "4.000000000"
                }
            ]
        };
        
        return createResponse(200, mockData);
    } catch (error) {
        console.error('Error in handleDequeuesMetrics:', error);
        throw error;
    }
}

/**
 * Create a properly formatted API Gateway response
 */
function createResponse(statusCode: number, body: any): APIGatewayProxyResult {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}

/**
 * Helper function to add days to a date string
 */
function addDays(dateString: string, days: number): string {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

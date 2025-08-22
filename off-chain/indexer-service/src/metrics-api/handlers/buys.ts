import { APIGatewayProxyResult } from 'aws-lambda';
import { queryBuyEvents } from '../helpers/queries';
import { ValidatedRequest } from '../helpers/validation';
import { createSuccessResponse } from '../helpers/response';
import { timestampToMs, generateDateRange, createDateBucket } from '../helpers/date';

/**
 * Handle buys metrics endpoint
 */
export async function handleBuysMetrics(request: ValidatedRequest): Promise<APIGatewayProxyResult> {
    try {
        const { from, to, fromTimestamp, toTimestamp } = request;
        
        // Query buy events from DynamoDB
        const buyEvents = await queryBuyEvents(fromTimestamp, toTimestamp);
        
        // Group events by day and count
        const eventsByDay = new Map<string, number>();
        
        for (const event of buyEvents) {
            const eventDate = new Date(timestampToMs(event.timestamp)).toISOString().split('T')[0];
            eventsByDay.set(eventDate, (eventsByDay.get(eventDate) || 0) + 1);
        }
        
        // Generate response data
        const dates = generateDateRange(from, to);
        const data = dates.map(dateStr => ({
            ...createDateBucket(dateStr),
            buys: eventsByDay.get(dateStr) || 0
        }));
        
        return createSuccessResponse({
            from,
            to,
            data
        });
    } catch (error) {
        console.error('Error in handleBuysMetrics:', error);
        throw error;
    }
}

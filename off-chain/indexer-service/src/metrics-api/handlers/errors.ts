import { APIGatewayProxyResult } from 'aws-lambda';
import { queryErrorEvents } from '../helpers/queries';
import { ValidatedRequest } from '../helpers/validation';
import { createSuccessResponse } from '../helpers/response';
import { timestampToMs, generateDateRange, createDateBucket } from '../helpers/date';

/**
 * Handle errors metrics endpoint
 */
export async function handleErrorsMetrics(request: ValidatedRequest): Promise<APIGatewayProxyResult> {
    try {
        const { from, to, fromTimestamp, toTimestamp } = request;
        
        // Query error events from DynamoDB
        const errorEvents = await queryErrorEvents(fromTimestamp, toTimestamp);
        
        // Group events by day
        const eventsByDay = new Map<string, { count: number, errorsByCode: Map<string, number> }>();
        
        for (const event of errorEvents) {
            const eventDate = new Date(timestampToMs(event.timestamp)).toISOString().split('T')[0];
            
            if (!eventsByDay.has(eventDate)) {
                eventsByDay.set(eventDate, { count: 0, errorsByCode: new Map() });
            }
            
            const dayData = eventsByDay.get(eventDate)!;
            dayData.count += 1;
            dayData.errorsByCode.set(event.error_code, (dayData.errorsByCode.get(event.error_code) || 0) + 1);
        }
        
        // Generate response data
        const dates = generateDateRange(from, to);
        const data = dates.map(dateStr => {
            const dayData = eventsByDay.get(dateStr);
            const errorsByCode: Record<string, number> = {};
            
            if (dayData) {
                for (const [errorCode, count] of dayData.errorsByCode.entries()) {
                    errorsByCode[errorCode] = count;
                }
            }
            
            return {
                ...createDateBucket(dateStr),
                errors: dayData?.count || 0,
                errorsByCode
            };
        });
        
        return createSuccessResponse({
            from,
            to,
            data
        });
    } catch (error) {
        console.error('Error in handleErrorsMetrics:', error);
        throw error;
    }
}

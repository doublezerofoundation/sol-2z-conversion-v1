import { APIGatewayProxyResult } from 'aws-lambda';
import { queryDequeueEvents } from '../helpers/queries';
import { ValidatedRequest } from '../helpers/validation';
import { createSuccessResponse } from '../helpers/response';
import { timestampToMs, generateDateRange, createDateBucket } from '../helpers/date';

/**
 * Handle dequeues metrics endpoint
 */
export async function handleDequeuesMetrics(request: ValidatedRequest): Promise<APIGatewayProxyResult> {
    try {
        const { from, to, fromTimestamp, toTimestamp } = request;
        
        // Query dequeue events from DynamoDB
        const dequeueEvents = await queryDequeueEvents(fromTimestamp, toTimestamp);
        
        // Group events by day and calculate statistics
        const eventsByDay = new Map<string, { amounts: number[], count: number }>();
        
        for (const event of dequeueEvents) {
            const eventDate = new Date(timestampToMs(event.timestamp)).toISOString().split('T')[0];
            
            if (!eventsByDay.has(eventDate)) {
                eventsByDay.set(eventDate, { amounts: [], count: 0 });
            }
            
            const dayData = eventsByDay.get(eventDate)!;
            dayData.amounts.push(event.sol_dequeued);
            dayData.count += 1;
        }
        
        // Generate response data
        const dates = generateDateRange(from, to);
        const data = dates.map(dateStr => {
            const dayData = eventsByDay.get(dateStr);
            let solDequeuedTotal = "0.000000000";
            let solDequeuedAvg = "0.000000000";
            let solDequeuedP95 = "0.000000000";
            
            if (dayData && dayData.amounts.length > 0) {
                const total = dayData.amounts.reduce((sum, amount) => sum + amount, 0);
                const avg = total / dayData.amounts.length;
                
                // Calculate P95
                const sortedAmounts = [...dayData.amounts].sort((a, b) => a - b);
                const p95Index = Math.ceil(sortedAmounts.length * 0.95) - 1;
                const p95 = sortedAmounts[Math.max(0, p95Index)];
                
                solDequeuedTotal = (total / 1e9).toFixed(9); // Convert lamports to SOL
                solDequeuedAvg = (avg / 1e9).toFixed(9);
                solDequeuedP95 = (p95 / 1e9).toFixed(9);
            }
            
            return {
                ...createDateBucket(dateStr),
                count: dayData?.count || 0,
                solDequeuedTotal,
                solDequeuedAvg,
                solDequeuedP95
            };
        });
        
        return createSuccessResponse({
            from,
            to,
            data
        });
    } catch (error) {
        console.error('Error in handleDequeuesMetrics:', error);
        throw error;
    }
}

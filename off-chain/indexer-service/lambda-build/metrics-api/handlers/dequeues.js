"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDequeuesMetrics = handleDequeuesMetrics;
const queries_1 = require("../helpers/queries");
const response_1 = require("../helpers/response");
const date_1 = require("../helpers/date");
/**
 * Handle dequeues metrics endpoint
 */
function handleDequeuesMetrics(request) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { from, to, fromTimestamp, toTimestamp } = request;
            // Query dequeue events from DynamoDB
            const dequeueEvents = yield (0, queries_1.queryDequeueEvents)(fromTimestamp, toTimestamp);
            // Group events by day and calculate statistics
            const eventsByDay = new Map();
            for (const event of dequeueEvents) {
                const eventDate = new Date((0, date_1.timestampToMs)(event.timestamp)).toISOString().split('T')[0];
                if (!eventsByDay.has(eventDate)) {
                    eventsByDay.set(eventDate, { amounts: [], count: 0 });
                }
                const dayData = eventsByDay.get(eventDate);
                dayData.amounts.push(event.sol_dequeued);
                dayData.count += 1;
            }
            // Generate response data
            const dates = (0, date_1.generateDateRange)(from, to);
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
                return Object.assign(Object.assign({}, (0, date_1.createDateBucket)(dateStr)), { count: (dayData === null || dayData === void 0 ? void 0 : dayData.count) || 0, solDequeuedTotal,
                    solDequeuedAvg,
                    solDequeuedP95 });
            });
            return (0, response_1.createSuccessResponse)({
                from,
                to,
                data
            });
        }
        catch (error) {
            console.error('Error in handleDequeuesMetrics:', error);
            throw error;
        }
    });
}

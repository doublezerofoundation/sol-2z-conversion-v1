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
exports.handleBuysMetrics = handleBuysMetrics;
const queries_1 = require("../helpers/queries");
const response_1 = require("../helpers/response");
const date_1 = require("../helpers/date");
/**
 * Handle buys metrics endpoint
 */
function handleBuysMetrics(request) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { from, to, fromTimestamp, toTimestamp } = request;
            // Query buy events from DynamoDB
            const buyEvents = yield (0, queries_1.queryBuyEvents)(fromTimestamp, toTimestamp);
            // Group events by day and count
            const eventsByDay = new Map();
            for (const event of buyEvents) {
                const eventDate = new Date((0, date_1.timestampToMs)(event.timestamp)).toISOString().split('T')[0];
                eventsByDay.set(eventDate, (eventsByDay.get(eventDate) || 0) + 1);
            }
            // Generate response data
            const dates = (0, date_1.generateDateRange)(from, to);
            const data = dates.map(dateStr => (Object.assign(Object.assign({}, (0, date_1.createDateBucket)(dateStr)), { buys: eventsByDay.get(dateStr) || 0 })));
            return (0, response_1.createSuccessResponse)({
                from,
                to,
                data
            });
        }
        catch (error) {
            console.error('Error in handleBuysMetrics:', error);
            throw error;
        }
    });
}

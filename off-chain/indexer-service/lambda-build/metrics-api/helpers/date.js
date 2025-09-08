"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDays = addDays;
exports.timestampToMs = timestampToMs;
exports.generateDateRange = generateDateRange;
exports.createDateBucket = createDateBucket;
/**
 * Helper function to add days to a date string
 */
function addDays(dateString, days) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}
/**
 * Convert timestamp to Unix time in milliseconds
 * DDB stores timestamps in seconds, so convert to milliseconds for JS Date
 */
function timestampToMs(timestamp) {
    // If timestamp is already in milliseconds (> year 2001 in seconds), use as-is
    // Otherwise convert from seconds to milliseconds
    return timestamp > 1e12 ? timestamp : timestamp * 1000;
}
/**
 * Generate date range array between two dates
 */
function generateDateRange(from, to) {
    const dates = [];
    const startDate = new Date(from);
    const endDate = new Date(to);
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}
/**
 * Create bucket data for a given date
 */
function createDateBucket(dateStr) {
    const nextDay = new Date(dateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    return {
        bucket: dateStr,
        start: `${dateStr}T00:00:00Z`,
        end: `${nextDay.toISOString().split('T')[0]}T00:00:00Z`
    };
}

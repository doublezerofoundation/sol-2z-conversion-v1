/**
 * Helper function to add days to a date string
 */
export function addDays(dateString: string, days: number): string {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

/**
 * Convert timestamp to Unix time in milliseconds
 * DDB stores timestamps in seconds, so convert to milliseconds for JS Date
 */
export function timestampToMs(timestamp: number): number {
    // If timestamp is already in milliseconds (> year 2001 in seconds), use as-is
    // Otherwise convert from seconds to milliseconds
    return timestamp > 1e12 ? timestamp : timestamp * 1000;
}

/**
 * Generate date range array between two dates
 */
export function generateDateRange(from: string, to: string): string[] {
    const dates: string[] = [];
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
export function createDateBucket(dateStr: string) {
    const nextDay = new Date(dateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    
    return {
        bucket: dateStr,
        start: `${dateStr}T00:00:00Z`,
        end: `${nextDay.toISOString().split('T')[0]}T00:00:00Z`
    };
}

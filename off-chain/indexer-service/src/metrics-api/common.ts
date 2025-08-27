// ---- Query Interfaces for Metrics ----
export interface BuyEventData {
    tx_hash: string;
    event_id: string;
    slot: number;
    timestamp: number;
    data: any;
}

export interface DequeueEventData {
    tx_hash: string;
    timestamp: number;
    action_id: string;
    requester: string;
    sol_dequeued: number;
    token_2z_dequeued: number;
    fills_consumed: number;
    slot: number;
}

export interface DenyListActionData {
    tx_hash: string;
    timestamp: number;
    action_id: string;
    address: string;
    action_type: string;
    action_by: string;
    update_count: number;
    slot: number;
}

// ---- DynamoDB Table Names ----
export enum DDBTable {
    SOLANA_EVENT = 'solana-event',
    FILL_DEQUEUE = 'fill-dequeue',
    DENY_LIST_ACTION = 'deny-list-action'
}

// ---- Event Types ----
export enum EventType {
    TRADE = 'TradeEvent'
}

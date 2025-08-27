// ---- DynamoDB Table Names ----
export enum DDBTable {
     SOLANA_EVENT = "solana-event",
     FILL_DEQUEUE = "fill-dequeue",
     DENY_LIST_ACTION = "deny-list-action",
     SYSTEM_STATE = "system-state",
}

export enum SystemStateKey {
    LAST_PROCESSED_SIGNATURE = "lastProcessedSignature",
}

// ---- Event Type Names ----
export enum EventType {
    TRADE = "TradeEvent",
    FILLS_DEQUEUED = "FillsDequeued",
    BID_TOO_LOW = "BidTooLowEvent",
    DENY_LIST_ADDRESS_ADDED = "DenyListAddressAdded",
    DENY_LIST_ADDRESS_REMOVED = "DenyListAddressRemoved",
    DEQUEUER_ADDED = "DequeuerAdded",
    DEQUEUER_REMOVED = "DequeuerRemoved"
}
   
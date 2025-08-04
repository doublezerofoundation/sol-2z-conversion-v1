// ---- DynamoDB Table Names ----
export enum DDBTable {
     SOLANA_EVENT = "solana-event",
     SOLANA_ERROR = "solana-error",
     FILL_DEQUEUE = "fill-dequeue",
     DENY_LIST_ACTION = "deny-list-action",
     SYSTEM_STATE = "system-state",
}

export enum SystemStateKey {
    LAST_PROCESSED_SIGNATURE = "lastProcessedSignature",
}
   
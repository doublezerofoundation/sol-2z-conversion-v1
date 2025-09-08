"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = exports.DDBTable = void 0;
// ---- DynamoDB Table Names ----
var DDBTable;
(function (DDBTable) {
    DDBTable["SOLANA_EVENT"] = "solana-event";
    DDBTable["FILL_DEQUEUE"] = "fill-dequeue";
    DDBTable["DENY_LIST_ACTION"] = "deny-list-action";
})(DDBTable || (exports.DDBTable = DDBTable = {}));
// ---- Event Types ----
var EventType;
(function (EventType) {
    EventType["TRADE"] = "TradeEvent";
})(EventType || (exports.EventType = EventType = {}));

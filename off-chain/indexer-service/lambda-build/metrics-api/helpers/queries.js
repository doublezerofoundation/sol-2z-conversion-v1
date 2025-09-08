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
exports.queryBuyEvents = queryBuyEvents;
exports.queryDequeueEvents = queryDequeueEvents;
exports.queryDenyListActions = queryDenyListActions;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const common_1 = require("../common");
const ddbDocClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
const table_prefix = `doublezero-${process.env.ENVIRONMENT || 'dev'}`;
/**
 * Query buy events between timestamps
 */
function queryBuyEvents(fromTimestamp, toTimestamp) {
    return __awaiter(this, void 0, void 0, function* () {
        // Using the event_type_timestamp GSI
        const params = {
            TableName: `${table_prefix}-${common_1.DDBTable.SOLANA_EVENT}`,
            IndexName: "event_type_timestamp_idx",
            KeyConditionExpression: "#event_type = :trade_event_type AND #timestamp BETWEEN :from AND :to",
            ExpressionAttributeNames: {
                "#event_type": "event_type",
                "#timestamp": "timestamp"
            },
            ExpressionAttributeValues: {
                ":trade_event_type": common_1.EventType.TRADE,
                ":from": fromTimestamp,
                ":to": toTimestamp
            }
        };
        // Handle pagination
        const items = [];
        let lastEvaluatedKey = undefined;
        do {
            const queryParams = Object.assign(Object.assign({}, params), { ExclusiveStartKey: lastEvaluatedKey });
            const result = yield ddbDocClient.send(new lib_dynamodb_1.QueryCommand(queryParams));
            if (result.Items) {
                items.push(...result.Items);
            }
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);
        return items;
    });
}
/**
 * Query dequeue events between timestamps
 */
function queryDequeueEvents(fromTimestamp, toTimestamp) {
    return __awaiter(this, void 0, void 0, function* () {
        // Using scan with filter
        const params = {
            TableName: `${table_prefix}-${common_1.DDBTable.FILL_DEQUEUE}`,
            FilterExpression: "#timestamp BETWEEN :from AND :to",
            ExpressionAttributeNames: {
                "#timestamp": "timestamp"
            },
            ExpressionAttributeValues: {
                ":from": fromTimestamp,
                ":to": toTimestamp
            }
        };
        // Handle pagination
        const items = [];
        let lastEvaluatedKey = undefined;
        do {
            const scanParams = Object.assign(Object.assign({}, params), { ExclusiveStartKey: lastEvaluatedKey });
            const result = yield ddbDocClient.send(new lib_dynamodb_1.ScanCommand(scanParams));
            if (result.Items) {
                items.push(...result.Items);
            }
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);
        return items;
    });
}
/**
 * Query deny list actions between timestamps
 */
function queryDenyListActions(fromTimestamp, toTimestamp) {
    return __awaiter(this, void 0, void 0, function* () {
        // Using scan with filter
        const params = {
            TableName: `${table_prefix}-${common_1.DDBTable.DENY_LIST_ACTION}`,
            FilterExpression: "#timestamp BETWEEN :from AND :to",
            ExpressionAttributeNames: {
                "#timestamp": "timestamp"
            },
            ExpressionAttributeValues: {
                ":from": fromTimestamp,
                ":to": toTimestamp
            }
        };
        // Handle pagination
        const items = [];
        let lastEvaluatedKey = undefined;
        do {
            const scanParams = Object.assign(Object.assign({}, params), { ExclusiveStartKey: lastEvaluatedKey });
            const result = yield ddbDocClient.send(new lib_dynamodb_1.ScanCommand(scanParams));
            if (result.Items) {
                items.push(...result.Items);
            }
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);
        return items;
    });
}

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { BuyEventData, ErrorEventData, DequeueEventData, DenyListActionData, DDBTable, EventType } from "../common";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const table_prefix = `doublezero-${process.env.ENVIRONMENT || 'dev'}`;

/**
 * Query buy events between timestamps
 */
export async function queryBuyEvents(fromTimestamp: number, toTimestamp: number): Promise<BuyEventData[]> {
     // Using the event_type_timestamp GSI
     const params: QueryCommandInput = {
          TableName: `${table_prefix}-${DDBTable.SOLANA_EVENT}`,
          IndexName: "event_type_timestamp_idx",
          KeyConditionExpression: "#event_type = :trade_event_type AND #timestamp BETWEEN :from AND :to",
          ExpressionAttributeNames: {
               "#event_type": "event_type",
               "#timestamp": "timestamp"
          },
          ExpressionAttributeValues: {
               ":trade_event_type": EventType.TRADE,
               ":from": fromTimestamp,
               ":to": toTimestamp
          }
     };

     // Handle pagination
     const items: BuyEventData[] = [];
     let lastEvaluatedKey = undefined;
     
     do {
          const queryParams: QueryCommandInput = {
               ...params,
               ExclusiveStartKey: lastEvaluatedKey
          };
          
          const result = await ddbDocClient.send(new QueryCommand(queryParams));
          if (result.Items) {
               items.push(...(result.Items as BuyEventData[]));
          }
          lastEvaluatedKey = result.LastEvaluatedKey;
     } while (lastEvaluatedKey);

     return items;
}

/**
 * Query error events between timestamps
 */
export async function queryErrorEvents(fromTimestamp: number, toTimestamp: number): Promise<ErrorEventData[]> {
     // Using the timestamp_idx GSI 
     const params: QueryCommandInput = {
          TableName: `${table_prefix}-${DDBTable.SOLANA_ERROR}`,
          IndexName: "timestamp_idx",
          KeyConditionExpression: "#timestamp BETWEEN :from AND :to",
          ExpressionAttributeNames: {
               "#timestamp": "timestamp"
          },
          ExpressionAttributeValues: {
               ":from": fromTimestamp,
               ":to": toTimestamp
          }
     };

     // Handle pagination
     const items: ErrorEventData[] = [];
     let lastEvaluatedKey = undefined;
     
     do {
          const queryParams: QueryCommandInput = {
               ...params,
               ExclusiveStartKey: lastEvaluatedKey
          };
          
          const result = await ddbDocClient.send(new QueryCommand(queryParams));
          if (result.Items) {
               items.push(...(result.Items as ErrorEventData[]));
          }
          lastEvaluatedKey = result.LastEvaluatedKey;
     } while (lastEvaluatedKey);

     return items;
}

/**
 * Query dequeue events between timestamps
 */
export async function queryDequeueEvents(fromTimestamp: number, toTimestamp: number): Promise<DequeueEventData[]> {
     // Using the timestamp_idx GSI
     const params: QueryCommandInput = {
          TableName: `${table_prefix}-${DDBTable.FILL_DEQUEUE}`,
          IndexName: "timestamp_idx",
          KeyConditionExpression: "#timestamp BETWEEN :from AND :to",
          ExpressionAttributeNames: {
               "#timestamp": "timestamp"
          },
          ExpressionAttributeValues: {
               ":from": fromTimestamp,
               ":to": toTimestamp
          }
     };

     // Handle pagination
     const items: DequeueEventData[] = [];
     let lastEvaluatedKey = undefined;
     
     do {
          const queryParams: QueryCommandInput = {
               ...params,
               ExclusiveStartKey: lastEvaluatedKey
          };
          
          const result = await ddbDocClient.send(new QueryCommand(queryParams));
          if (result.Items) {
               items.push(...(result.Items as DequeueEventData[]));
          }
          lastEvaluatedKey = result.LastEvaluatedKey;
     } while (lastEvaluatedKey);

     return items;
}

/**
 * Query deny list actions between timestamps
 */
export async function queryDenyListActions(fromTimestamp: number, toTimestamp: number): Promise<DenyListActionData[]> {
     // Using the timestamp_idx GSI
     const params: QueryCommandInput = {
          TableName: `${table_prefix}-${DDBTable.DENY_LIST_ACTION}`,
          IndexName: "timestamp_idx",
          KeyConditionExpression: "#timestamp BETWEEN :from AND :to",
          ExpressionAttributeNames: {
               "#timestamp": "timestamp"
          },
          ExpressionAttributeValues: {
               ":from": fromTimestamp,
               ":to": toTimestamp
          }
     };

     // Handle pagination
     const items: DenyListActionData[] = [];
     let lastEvaluatedKey = undefined;
     
     do {
          const queryParams: QueryCommandInput = {
               ...params,
               ExclusiveStartKey: lastEvaluatedKey
          };
          
          const result = await ddbDocClient.send(new QueryCommand(queryParams));
          if (result.Items) {
               items.push(...(result.Items as DenyListActionData[]));
          }
          lastEvaluatedKey = result.LastEvaluatedKey;
     } while (lastEvaluatedKey);

     return items;
}

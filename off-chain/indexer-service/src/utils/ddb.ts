import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
} from "@aws-sdk/lib-dynamodb";

// Create a single, shared DynamoDB DocumentClient
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function writeSolanaEvent(
  txHash: string,
  eventId: string,
  eventType: string,
  data: Record<string, any>,
  slot: number,
  timestamp: number
) {
  const params: PutCommandInput = {
    TableName: process.env.SOLANA_EVENT_TABLE_NAME!,
    Item: {
      tx_hash: txHash,
      event_id: eventId,
      event_type: eventType,
      data,      
      slot,
      timestamp,
    },
  };
  await ddbDocClient.send(new PutCommand(params));
}

export async function writeSolanaError(
  txHash: string,
  errorCode: string,
  logs: string[],
  slot: number,
  timestamp: number
) {
  const params: PutCommandInput = {
    TableName: process.env.SOLANA_ERROR_TABLE_NAME!,
    Item: {
      tx_hash: txHash,
      error_code: errorCode,
      logs,
      slot,
      timestamp,
    },
  };
  await ddbDocClient.send(new PutCommand(params));
}

export async function writeFillDequeue(
  txHash: string,
  actionId: string,
  data: Record<string, any>,
  slot: number,
  timestamp: number
) {
  const params: PutCommandInput = {
    TableName: process.env.FILL_DEQUEUE_TABLE_NAME!,
    Item: {
      tx_hash: txHash,
      timestamp,       // sort key
      action_id: actionId,  
      data,         
      slot,
    },
  };
  await ddbDocClient.send(new PutCommand(params));
}

export async function writeDenyListAction(
  txHash: string,
  actionId: string,
  data: Record<string, any>,
  slot: number,
  timestamp: number
) {
  const params: PutCommandInput = {
    TableName: process.env.DENY_LIST_ACTION_TABLE_NAME!,
    Item: {
      tx_hash: txHash,
      timestamp,        // sort key
      action_id: actionId,
      data,         
      slot,
    },
  };
  await ddbDocClient.send(new PutCommand(params));
}

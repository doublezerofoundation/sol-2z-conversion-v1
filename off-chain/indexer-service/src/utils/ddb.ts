import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { DDBTable } from "../common";

// Create a single, shared DynamoDB DocumentClient
const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const table_prefix = `doublezero-${process.env.ENV!}`;

export async function writeSolanaEvent(
  txHash: string,
  eventId: string,
  eventType: string,
  data: Record<string, any>,
  slot: number,
  timestamp: number
) {
  const params: PutCommandInput = {
    TableName: `${table_prefix}-${DDBTable.SOLANA_EVENT}`,
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
    TableName: `${table_prefix}-${DDBTable.SOLANA_ERROR}`,
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
    TableName: `${table_prefix}-${DDBTable.FILL_DEQUEUE}`,
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
    TableName: `${table_prefix}-${DDBTable.DENY_LIST_ACTION}`,
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

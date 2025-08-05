import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { DDBTable, SystemStateKey } from "../common";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const table_prefix = `doublezero-${process.env.ENV!}`;

// ---- System State ----

export async function setLastProcessedSig(sig: string | null) {
  await ddbDocClient.send(
    new PutCommand({
      TableName: `${table_prefix}-${DDBTable.SYSTEM_STATE}`,
      Item: {
        key: SystemStateKey.LAST_PROCESSED_SIGNATURE,
        value: sig ?? "null",
      },
    })
  );
}

export async function getLastProcessedSig(): Promise<string | null> {
  const result = await ddbDocClient.send(
    new GetCommand({
      TableName: `${table_prefix}-${DDBTable.SYSTEM_STATE}`,
      Key: { key: SystemStateKey.LAST_PROCESSED_SIGNATURE },
    })
  );
  if (!result.Item || result.Item.value === "null") return null;
  return result.Item.value;
}

// ---- Solana Event ----

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

// ---- Solana Error ----

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

// ---- Fill Dequeue ----

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
      timestamp, // sort key
      action_id: actionId,
      data,
      slot,
    },
  };
  await ddbDocClient.send(new PutCommand(params));
}

// ---- Deny List Action ----

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
      timestamp, // sort key
      action_id: actionId,
      data,
      slot,
    },
  };
  await ddbDocClient.send(new PutCommand(params));
}
import { PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { DDBTable } from "../../common";
import { ddbDocClient, table_prefix } from "./client";

/**
 * Write a Solana event to the database
 */
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

/**
 * Write a fill dequeue event to the database
 */
export async function writeFillDequeue(
  txHash: string,
  actionId: string,
  requester: string,
  solDequeued: number,
  token2zDequeued: number,
  fillsConsumed: number,
  slot: number,
  timestamp: number
) {
  const params: PutCommandInput = {
    TableName: `${table_prefix}-${DDBTable.FILL_DEQUEUE}`,
    Item: {
      tx_hash: txHash,
      timestamp, // sort key
      action_id: actionId,
      requester,
      sol_dequeued: solDequeued,
      token_2z_dequeued: token2zDequeued,
      fills_consumed: fillsConsumed,
      slot,
    },
  };
  await ddbDocClient.send(new PutCommand(params));
}

/**
 * Write a deny list action to the database
 */
export async function writeDenyListAction(
  txHash: string,
  actionId: string,
  address: string,
  actionType: string,
  actionBy: string,
  updateCount: number,
  slot: number,
  timestamp: number
) {
  const params: PutCommandInput = {
    TableName: `${table_prefix}-${DDBTable.DENY_LIST_ACTION}`,
    Item: {
      tx_hash: txHash,
      timestamp, // sort key
      action_id: actionId,
      address,
      action_type: actionType,
      action_by: actionBy,
      update_count: updateCount,
      slot,
    },
  };
  await ddbDocClient.send(new PutCommand(params));
}

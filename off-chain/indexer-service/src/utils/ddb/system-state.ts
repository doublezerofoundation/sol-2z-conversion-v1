import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DDBTable, SystemStateKey } from "../../common";
import { ddbDocClient, table_prefix } from "./client";

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

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { configUtil } from '../configUtil';

export const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const table_prefix = `doublezero-${configUtil.getEnvironment()}`;

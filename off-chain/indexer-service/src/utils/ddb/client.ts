import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ENV } from '../config';

export const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const table_prefix = `doublezero-${ENV}`;

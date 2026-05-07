/**
 * Lambda: records-delete
 * DELETE /records/{id}
 *
 * Permanently removes a record. Uses ConditionExpression so a missing id
 * returns 404 rather than a silent no-op.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.DYNAMODB_TABLE;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Record ID required" }),
    };
  }

  try {
    await client.send(new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", ...CORS },
        body: JSON.stringify({ error: "Record not found" }),
      };
    }
    console.error("records-delete error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Failed to delete record" }),
    };
  }
};

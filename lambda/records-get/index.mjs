/**
 * Lambda: records-get
 * GET /records/{id}
 *
 * Fetches a single weather record by its UUID primary key.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

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
    const result = await client.send(new GetCommand({ TableName: TABLE, Key: { id } }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", ...CORS },
        body: JSON.stringify({ error: "Record not found" }),
      };
    }

    const item = {
      ...result.Item,
      country: result.Item.country || null,
      temperature_data: JSON.parse(result.Item.temperature_data ?? "[]"),
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify(item),
    };
  } catch (err) {
    console.error("records-get error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Failed to fetch record" }),
    };
  }
};

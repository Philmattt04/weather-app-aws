/**
 * Lambda: records-list
 * GET /records
 *
 * Scans the entire DynamoDB table and returns all records sorted by
 * created_at descending. Handles pagination internally — loops until
 * LastEvaluatedKey is null so the caller always gets the full list.
 *
 * temperature_data is stored as a JSON string in DynamoDB and is
 * parsed back to an array before returning so the frontend receives
 * the same shape as the original Supabase version.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.DYNAMODB_TABLE;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async () => {
  try {
    // Paginate through the full table — loops until no more pages remain
    let items = [];
    let lastKey = undefined;
    do {
      const result = await client.send(new ScanCommand({
        TableName: TABLE,
        ExclusiveStartKey: lastKey,
      }));
      items = items.concat(result.Items ?? []);
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    // Parse temperature_data from JSON string back to array
    const records = items.map(deserialize);

    // Sort newest first — mirrors the Supabase ORDER BY created_at DESC
    records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify(records),
    };
  } catch (err) {
    console.error("records-list error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Failed to fetch records" }),
    };
  }
};

function deserialize(item) {
  return {
    ...item,
    country: item.country || null,
    temperature_data: typeof item.temperature_data === "string"
      ? JSON.parse(item.temperature_data)
      : item.temperature_data ?? [],
  };
}

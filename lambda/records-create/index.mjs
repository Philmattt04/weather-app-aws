/**
 * Lambda: records-create
 * POST /records
 *
 * Creates a new weather record in DynamoDB. Mirrors the POST handler in
 * the original /api/records route but writes to DynamoDB instead of Supabase.
 *
 * temperature_data is stored as a JSON string because DynamoDB has a 400KB
 * item size limit and nested attribute nesting limits. Stringifying preserves
 * the exact same data structure without hitting those constraints.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.DYNAMODB_TABLE;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const {
      location_query, city_name, country, latitude, longitude,
      start_date, end_date, temperature_data, units, notes,
    } = body;

    // Validate required fields before touching the database
    if (!location_query || !city_name || latitude == null || longitude == null ||
        !start_date || !end_date || !temperature_data) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", ...CORS },
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(), // Node 20 built-in — no uuid package needed
      location_query,
      city_name,
      country: country ?? "",  // DynamoDB strings cannot be null; use empty string
      latitude,
      longitude,
      start_date,
      end_date,
      temperature_data: JSON.stringify(temperature_data), // stored as JSON string
      units: units ?? "imperial",
      notes: notes ?? "",
      created_at: now,
      updated_at: now,
    };

    await client.send(new PutCommand({ TableName: TABLE, Item: item }));

    // Return the item with temperature_data parsed back so the frontend
    // receives the same shape it already expects
    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ ...item, country: item.country || null, temperature_data }),
    };
  } catch (err) {
    console.error("records-create error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Failed to create record" }),
    };
  }
};

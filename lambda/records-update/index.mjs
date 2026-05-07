/**
 * Lambda: records-update
 * PUT /records/{id}
 *
 * Updates allowed fields on an existing record: notes, units, temperature_data.
 * Builds the UpdateExpression dynamically from whichever fields are present
 * in the request body. Always stamps updated_at.
 *
 * Uses ConditionExpression to return 404 instead of silently creating a new
 * item when the id doesn't exist (DynamoDB Update would otherwise upsert).
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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
    const body = JSON.parse(event.body ?? "{}");

    // Collect only the fields we allow to be updated
    const allowed = {};
    if (body.notes !== undefined) allowed.notes = body.notes;
    if (body.units !== undefined) {
      if (!["imperial", "metric"].includes(body.units)) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", ...CORS },
          body: JSON.stringify({ error: "units must be imperial or metric" }),
        };
      }
      allowed.units = body.units;
    }
    if (body.temperature_data !== undefined) {
      // Re-stringify the reconverted data before storing
      allowed.temperature_data = JSON.stringify(body.temperature_data);
    }

    if (Object.keys(allowed).length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", ...CORS },
        body: JSON.stringify({ error: "No valid fields to update" }),
      };
    }

    allowed.updated_at = new Date().toISOString();

    // Build UpdateExpression: SET #k0 = :v0, #k1 = :v1, ...
    // Using ExpressionAttributeNames avoids reserved word conflicts
    const keys = Object.keys(allowed);
    const updateExpression = "SET " + keys.map((_, i) => `#k${i} = :v${i}`).join(", ");
    const expressionAttributeNames = Object.fromEntries(keys.map((k, i) => [`#k${i}`, k]));
    const expressionAttributeValues = Object.fromEntries(keys.map((k, i) => [`:v${i}`, allowed[k]]));

    const result = await client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: "attribute_exists(id)", // 404 if record doesn't exist
      ReturnValues: "ALL_NEW",
    }));

    const item = {
      ...result.Attributes,
      country: result.Attributes.country || null,
      temperature_data: JSON.parse(result.Attributes.temperature_data ?? "[]"),
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify(item),
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", ...CORS },
        body: JSON.stringify({ error: "Record not found" }),
      };
    }
    console.error("records-update error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Failed to update record" }),
    };
  }
};

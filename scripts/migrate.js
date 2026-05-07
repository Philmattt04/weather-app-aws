/**
 * Migration script: Supabase → DynamoDB
 *
 * Transfers all records from the Supabase weather_records table to DynamoDB.
 * Safe to re-run — PutItem overwrites items with matching IDs, so the script
 * is idempotent.
 *
 * Usage:
 *   node scripts/migrate.js
 *
 * Required environment variables:
 *   SUPABASE_URL       — your Supabase project URL
 *   SUPABASE_ANON_KEY  — your Supabase anon key
 *   DYNAMODB_TABLE     — DynamoDB table name (from `terraform output dynamodb_table_name`)
 *   AWS_REGION         — AWS region (default: us-east-1)
 *
 * Install dependencies first:
 *   npm install @supabase/supabase-js @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
 */

import { createClient } from "@supabase/supabase-js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TABLE = process.env.DYNAMODB_TABLE;
const REGION = process.env.AWS_REGION ?? "us-east-1";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TABLE) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_ANON_KEY, DYNAMODB_TABLE");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const BATCH_SIZE = 25;    // DynamoDB BatchWrite hard limit
const PAGE_SIZE = 100;    // Supabase rows per page

async function fetchAllSupabaseRecords() {
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("weather_records")
      .select("*")
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`Supabase fetch error: ${error.message}`);
    if (!data.length) break;

    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

// Convert a Supabase row to the DynamoDB item shape
function toItem(row) {
  return {
    id: row.id,
    location_query: row.location_query,
    city_name: row.city_name,
    country: row.country ?? "",             // DynamoDB strings cannot be null
    latitude: row.latitude,
    longitude: row.longitude,
    start_date: row.start_date,
    end_date: row.end_date,
    temperature_data: JSON.stringify(row.temperature_data ?? []),
    units: row.units ?? "imperial",
    notes: row.notes ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Write one batch of up to 25 items, retrying UnprocessedItems with backoff
async function writeBatch(items, attempt = 1) {
  const requests = items.map((item) => ({ PutRequest: { Item: item } }));
  const result = await dynamo.send(new BatchWriteCommand({ RequestItems: { [TABLE]: requests } }));

  const unprocessed = result.UnprocessedItems?.[TABLE];
  if (unprocessed?.length) {
    if (attempt > 3) {
      console.warn(`  ${unprocessed.length} items still unprocessed after 3 retries`);
      return;
    }
    const delay = 200 * Math.pow(2, attempt - 1); // exponential backoff
    console.log(`  Retrying ${unprocessed.length} unprocessed items (attempt ${attempt + 1})...`);
    await new Promise((r) => setTimeout(r, delay));
    await writeBatch(unprocessed.map((r) => r.PutRequest.Item), attempt + 1);
  }
}

async function main() {
  console.log("Fetching records from Supabase...");
  const rows = await fetchAllSupabaseRecords();
  console.log(`Found ${rows.length} records.`);

  if (!rows.length) {
    console.log("Nothing to migrate.");
    return;
  }

  const items = rows.map(toItem);
  let migrated = 0;

  // Split into batches of 25 and write each
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  Writing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)}...`);
    await writeBatch(batch);
    migrated += batch.length;
    console.log(` done (${migrated}/${items.length})`);
  }

  console.log(`\nMigration complete. ${migrated} records written to DynamoDB table "${TABLE}".`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

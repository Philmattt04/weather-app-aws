/**
 * Lambda: records-export
 * GET /records/export?format=json|csv|xml|md|pdf
 *
 * Exports all DynamoDB records in the requested format.
 * pdfkit must be bundled in this Lambda's node_modules.
 * Run `npm install` in this directory before `terraform apply`.
 *
 * API Gateway has a 10MB response limit; this is ample for typical usage
 * given the 30-day max range per record.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import PDFDocument from "pdfkit";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.DYNAMODB_TABLE;

// This endpoint is fronted by an edge-optimized (CloudFront) API Gateway
// deployment. Without an explicit no-store directive, CloudFront caches
// GET responses at the edge — including binary PDF bodies mangled by a
// misconfigured stage — and keeps serving that stale/broken copy long
// after the underlying bug is fixed. Exports must always reflect the
// latest DynamoDB data, so caching must be disabled outright.
const CORS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };

// ── Format helpers ────────────────────────────────────────────────────────────

function toCSV(records) {
  const header = "id,location_query,city_name,country,latitude,longitude,start_date,end_date,units,notes,avg_temp,created_at";
  const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const rows = records.map((r) => {
    const avgs = r.temperature_data.map((d) => d.temp_avg).filter((v) => v != null);
    const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : "";
    return [r.id, esc(r.location_query), esc(r.city_name), esc(r.country), r.latitude, r.longitude, r.start_date, r.end_date, r.units, esc(r.notes), avg, r.created_at].join(",");
  });
  return [header, ...rows].join("\n");
}

function toXML(records) {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const items = records.map((r) => `
  <record>
    <id>${r.id}</id>
    <city_name>${esc(r.city_name)}</city_name>
    <country>${esc(r.country)}</country>
    <start_date>${r.start_date}</start_date>
    <end_date>${r.end_date}</end_date>
    <units>${r.units}</units>
    <notes>${esc(r.notes)}</notes>
    <temperature_data>
      ${r.temperature_data.map((d) => `<day date="${d.date}" temp_max="${d.temp_max ?? ""}" temp_min="${d.temp_min ?? ""}" temp_avg="${d.temp_avg ?? ""}" />`).join("\n      ")}
    </temperature_data>
    <created_at>${r.created_at}</created_at>
  </record>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<weather_records>${items}\n</weather_records>`;
}

function toMarkdown(records) {
  const lines = [`# Weather Records\n\nGenerated: ${new Date().toISOString()}\n`];
  for (const r of records) {
    const avgs = r.temperature_data.map((d) => d.temp_avg).filter((v) => v != null);
    const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : "N/A";
    const u = r.units === "imperial" ? "°F" : "°C";
    lines.push(`## ${r.city_name}, ${r.country ?? "N/A"}`);
    lines.push(`- **Date Range:** ${r.start_date} → ${r.end_date}`);
    lines.push(`- **Avg Temp:** ${avg}${u}  |  **Units:** ${r.units}`);
    lines.push(`- **Notes:** ${r.notes || "—"}\n`);
    lines.push(`| Date | High | Low | Avg |`);
    lines.push(`|------|------|-----|-----|`);
    for (const d of r.temperature_data) {
      lines.push(`| ${d.date} | ${d.temp_max ?? "—"}${u} | ${d.temp_min ?? "—"}${u} | ${d.temp_avg ?? "—"}${u} |`);
    }
    lines.push("\n---\n");
  }
  return lines.join("\n");
}

function toPDF(records) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).font("Helvetica-Bold").text("Weather Records", { align: "center" });
    doc.fontSize(10).font("Helvetica").fillColor("#666").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(1.5);

    records.forEach((r, i) => {
      const u = r.units === "imperial" ? "°F" : "°C";
      const avgs = r.temperature_data.map((d) => d.temp_avg).filter((v) => v != null);
      const avg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : "N/A";

      doc.fillColor("#000").fontSize(14).font("Helvetica-Bold")
        .text(`${i + 1}. ${r.city_name}, ${r.country ?? "N/A"}`);
      doc.fontSize(10).font("Helvetica")
        .text(`Date Range: ${r.start_date} → ${r.end_date}`)
        .text(`Avg Temp: ${avg}${u}  |  Units: ${r.units}`)
        .text(`Notes: ${r.notes || "None"}`);

      if (r.temperature_data.length) {
        doc.moveDown(0.5).font("Helvetica-Bold").text("Daily Data:").font("Helvetica");
        r.temperature_data.forEach((d) => {
          doc.text(`  ${d.date}  H: ${d.temp_max ?? "N/A"}${u}  L: ${d.temp_min ?? "N/A"}${u}  Avg: ${d.temp_avg ?? "N/A"}${u}`);
        });
      }
      if (i < records.length - 1) {
        doc.moveDown().moveTo(50, doc.y).lineTo(545, doc.y).stroke("#ccc").moveDown();
      }
    });
    doc.end();
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  const format = event.queryStringParameters?.format ?? "json";
  const ts = new Date().toISOString().slice(0, 10);

  try {
    // Scan entire table with pagination
    let items = [];
    let lastKey;
    do {
      const res = await client.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey: lastKey }));
      items = items.concat(res.Items ?? []);
      lastKey = res.LastEvaluatedKey;
    } while (lastKey);

    const records = items
      .map((item) => ({
        ...item,
        country: item.country || null,
        temperature_data: JSON.parse(item.temperature_data ?? "[]"),
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (format === "json") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="weather_records_${ts}.json"`, ...CORS },
        body: JSON.stringify(records, null, 2),
      };
    }
    if (format === "csv") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="weather_records_${ts}.csv"`, ...CORS },
        body: toCSV(records),
      };
    }
    if (format === "xml") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/xml", "Content-Disposition": `attachment; filename="weather_records_${ts}.xml"`, ...CORS },
        body: toXML(records),
      };
    }
    if (format === "md") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/markdown", "Content-Disposition": `attachment; filename="weather_records_${ts}.md"`, ...CORS },
        body: toMarkdown(records),
      };
    }
    if (format === "pdf") {
      const buf = await toPDF(records);
      return {
        statusCode: 200,
        isBase64Encoded: true, // Required for binary responses via API Gateway
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="weather_records_${ts}.pdf"`, ...CORS },
        body: buf.toString("base64"),
      };
    }

    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Invalid format. Use: json, csv, xml, md, pdf" }),
    };
  } catch (err) {
    console.error("records-export error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Export failed" }),
    };
  }
};

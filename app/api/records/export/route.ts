/**
 * API Route: /api/records/export
 *
 * Proxies the export request to the API Gateway /records/export Lambda.
 * Pipes the binary response (PDF) and text responses (CSV etc.) back using
 * arrayBuffer() so the browser receives the file unchanged.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiGatewayBase } from "@/app/lib/apiGateway";

export async function GET(request: NextRequest) {
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const res = await fetch(`${getApiGatewayBase()}/records/export?format=${format}`);

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const disposition = res.headers.get("content-disposition") ?? "";

  return new NextResponse(await res.arrayBuffer(), {
    status: res.status,
    headers: { "Content-Type": contentType, "Content-Disposition": disposition },
  });
}

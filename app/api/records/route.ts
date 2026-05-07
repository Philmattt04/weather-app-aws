/**
 * API Route: /api/records
 *
 * Thin proxy to the API Gateway /records endpoint backed by Lambda + DynamoDB.
 * The browser never calls API Gateway directly, so no CORS issues arise in development.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiGatewayBase } from "@/app/lib/apiGateway";

export async function GET() {
  const res = await fetch(`${getApiGatewayBase()}/records`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${getApiGatewayBase()}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

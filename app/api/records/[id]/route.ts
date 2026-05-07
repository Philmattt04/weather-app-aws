/**
 * API Route: /api/records/[id]
 *
 * Proxies PUT and DELETE to the API Gateway /records/{id} Lambda endpoints.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiGatewayBase } from "@/app/lib/apiGateway";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const res = await fetch(`${getApiGatewayBase()}/records/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${getApiGatewayBase()}/records/${id}`, { method: "DELETE" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

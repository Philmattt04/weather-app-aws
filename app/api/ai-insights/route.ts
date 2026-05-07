/**
 * API Route: /api/ai-insights
 *
 * Receives current weather data from the AIInsights component and forwards it
 * to the API Gateway /ai endpoint, which invokes the Bedrock Lambda.
 * Running this server-side keeps the API Gateway URL out of the browser.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiGatewayBase } from "@/app/lib/apiGateway";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${getApiGatewayBase()}/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

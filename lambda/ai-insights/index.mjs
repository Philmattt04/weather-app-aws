/**
 * Lambda: ai-insights
 * POST /ai
 *
 * Calls Amazon Bedrock (Claude 3 Haiku) with the current weather data
 * and returns structured AI-generated insights including a weather summary,
 * activity recommendations, and clothing suggestions.
 *
 * Bedrock must be enabled in your AWS account for the configured region.
 * Go to: AWS Console → Bedrock → Model Access → Enable Claude 3 Haiku
 *
 * Temperature: 0.4 — keeps suggestions grounded without being robotic.
 * Max tokens: 600 — sufficient for the structured JSON output.
 *
 * Error handling: returns null fields on Bedrock error so the frontend
 * can silently hide the insights card rather than showing an error.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: process.env.APP_REGION ?? "us-east-1" });
const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-3-haiku-20240307-v1:0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

const EMPTY_INSIGHTS = { summary: null, activities: [], clothing: [] };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const {
      city, country, temperature, feelsLike, tempMax, tempMin,
      humidity, windSpeed, windDir, visibility, pressure,
      weatherDescription, units,
    } = body;

    const tempUnit = units === "imperial" ? "°F" : "°C";
    const speedUnit = units === "imperial" ? "mph" : "m/s";

    // Build the prompt with live weather values
    const userPrompt = `You are a helpful weather assistant. Based on the current weather conditions:

Location: ${city}${country ? `, ${country}` : ""}
Conditions: ${weatherDescription}
Temperature: ${temperature}${tempUnit} (feels like ${feelsLike}${tempUnit})
High / Low: ${tempMax}${tempUnit} / ${tempMin}${tempUnit}
Humidity: ${humidity}%
Wind: ${windSpeed} ${speedUnit} ${windDir}
Visibility: ${visibility} km
Pressure: ${pressure} hPa

Respond ONLY with valid JSON in exactly this shape — no prose outside the object:
{
  "summary": "One sentence describing today's overall conditions.",
  "activities": ["activity 1", "activity 2", "activity 3"],
  "clothing": ["item 1", "item 2", "item 3"]
}
Keep each item under 12 words. Be specific to the conditions.`;

    // Bedrock Messages API format for Claude models
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 600,
      temperature: 0.4,
      messages: [{ role: "user", content: userPrompt }],
    };

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await bedrock.send(command);

    // Bedrock returns the response body as a Uint8Array
    const responseText = new TextDecoder().decode(response.body);
    const bedrockResponse = JSON.parse(responseText);

    // Extract the text content from Claude's response
    const rawContent = bedrockResponse.content?.[0]?.text ?? "";

    // Parse the JSON from Claude's response — strip any markdown code fences
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Bedrock response");

    const insights = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({
        summary: insights.summary ?? null,
        activities: Array.isArray(insights.activities) ? insights.activities : [],
        clothing: Array.isArray(insights.clothing) ? insights.clothing : [],
      }),
    };
  } catch (err) {
    console.error("ai-insights error:", err);
    // Return empty insights rather than an error — frontend hides the card gracefully
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify(EMPTY_INSIGHTS),
    };
  }
};

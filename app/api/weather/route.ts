/**
 * API Route: /api/weather
 *
 * Server-side proxy for the OpenWeatherMap API.
 * Keeping this server-side ensures the API key is never exposed to the browser.
 *
 * Query parameters:
 *   type    - "current" for live conditions, "forecast" for the 5-day / 3-hour forecast
 *   q       - city name, zip code, or "city,countryCode" (e.g. "London,GB")
 *   lat/lon - GPS coordinates (alternative to q)
 *   units   - "imperial" (°F, mph) or "metric" (°C, m/s)
 *
 * Responses are cached for 5 minutes via Next.js fetch revalidation.
 */

import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');   // "current" or "forecast"
  const query = searchParams.get('q');     // text search
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const units = searchParams.get('units') || 'imperial';

  if (!API_KEY) {
    return NextResponse.json({ error: 'Weather service not configured' }, { status: 500 });
  }

  try {
    let endpoint = '';

    // Build the location portion of the URL — prefer coordinates over text query
    const locPart =
      lat && lon
        ? `lat=${lat}&lon=${lon}`
        : query
        ? `q=${encodeURIComponent(query)}`
        : null;

    if (!locPart) {
      return NextResponse.json({ error: 'Query or coordinates required' }, { status: 400 });
    }

    // Route to the correct OpenWeatherMap endpoint based on request type
    if (type === 'current') {
      // /weather returns current conditions for a single point in time
      endpoint = `/data/2.5/weather?${locPart}&units=${units}&appid=${API_KEY}`;
    } else if (type === 'forecast') {
      // /forecast returns 40 data points, one every 3 hours, covering 5 days
      endpoint = `/data/2.5/forecast?${locPart}&units=${units}&appid=${API_KEY}`;
    } else {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }

    // Cache each unique request for 5 minutes to avoid hitting rate limits
    const response = await fetch(`${BASE_URL}${endpoint}`, { next: { revalidate: 300 } });
    const data = await response.json();

    if (!response.ok) {
      // Surface a human-readable message for 404 (location not found) vs other errors
      const message =
        data.cod === '404'
          ? 'Location not found. Please check the city name, zip code, or coordinates.'
          : data.message || 'Failed to fetch weather data.';
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Weather service unavailable. Please try again.' },
      { status: 500 }
    );
  }
}

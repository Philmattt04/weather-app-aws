/**
 * API Route: /api/weather-range
 *
 * Fetches daily temperature data for a location over a custom date range.
 * Uses Open-Meteo (free, no API key) for temperature data and
 * OpenWeatherMap geocoding to resolve text queries to coordinates.
 *
 * Supports:
 *   - Historical data back to 1940 (archive.open-meteo.com)
 *   - Forecasts up to 16 days ahead (api.open-meteo.com)
 *   - Mixed ranges that span past and future — splits the call automatically
 *
 * Query parameters:
 *   location   - city name, zip, etc. (geocoded via OpenWeatherMap)
 *   lat / lon  - optional: bypass geocoding when coordinates are already known
 *   start_date - YYYY-MM-DD
 *   end_date   - YYYY-MM-DD (max 30-day range, max 16 days in future)
 *   units      - "imperial" (°F) or "metric" (°C)
 */

import { NextRequest, NextResponse } from 'next/server';

const OWM_KEY = process.env.OPENWEATHER_API_KEY;
const OM_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const OM_FORECAST = 'https://api.open-meteo.com/v1/forecast';

// Daily variables requested from Open-Meteo
const DAILY_VARS = 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max';

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_sum: (number | null)[];
  windspeed_10m_max: (number | null)[];
}

// Merge two Open-Meteo daily result objects (used when a range spans past + future)
function mergeDaily(a: OpenMeteoDaily, b: OpenMeteoDaily): OpenMeteoDaily {
  return {
    time: [...a.time, ...b.time],
    temperature_2m_max: [...a.temperature_2m_max, ...b.temperature_2m_max],
    temperature_2m_min: [...a.temperature_2m_min, ...b.temperature_2m_min],
    precipitation_sum: [...a.precipitation_sum, ...b.precipitation_sum],
    windspeed_10m_max: [...a.windspeed_10m_max, ...b.windspeed_10m_max],
  };
}

// Fetch the daily block from an Open-Meteo URL and throw on API-level errors
async function fetchOM(url: string): Promise<OpenMeteoDaily> {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.reason || 'Open-Meteo error');
  return data.daily as OpenMeteoDaily;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  const directLat = searchParams.get('lat');   // pre-resolved coordinates (skips geocoding)
  const directLon = searchParams.get('lon');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const units = searchParams.get('units') || 'imperial';

  // Must have either a text location or explicit lat/lon, plus both dates
  if ((!location && (!directLat || !directLon)) || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'location (or lat+lon), start_date, and end_date are required' },
      { status: 400 }
    );
  }

  // --- Date validation ---
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
  }
  if (end < start) {
    return NextResponse.json({ error: 'End date must be on or after start date.' }, { status: 400 });
  }
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (daysDiff > 30) {
    return NextResponse.json({ error: 'Date range cannot exceed 30 days.' }, { status: 400 });
  }
  const maxFuture = new Date();
  maxFuture.setDate(maxFuture.getDate() + 16);
  if (end > maxFuture) {
    return NextResponse.json({ error: 'End date cannot be more than 16 days in the future.' }, { status: 400 });
  }

  try {
    // --- Resolve coordinates ---
    let lat: number, lon: number, name: string, country: string;

    if (directLat && directLon) {
      // Coordinates supplied directly (used when re-converting units for a saved record)
      lat = parseFloat(directLat);
      lon = parseFloat(directLon);
      name = location ?? `${lat}, ${lon}`;
      country = '';
    } else {
      // Geocode the text query via OpenWeatherMap to get lat/lon
      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location!)}&limit=1&appid=${OWM_KEY}`
      );
      const geoData = await geoRes.json();
      if (!Array.isArray(geoData) || !geoData.length) {
        return NextResponse.json(
          { error: 'Location not found. Try a different city name or add a country code (e.g. "Paris,FR").' },
          { status: 404 }
        );
      }
      ({ lat, lon, name, country } = geoData[0]);
    }

    // Build the shared Open-Meteo parameter string
    const tempUnit = units === 'imperial' ? 'fahrenheit' : 'celsius';
    const baseParams = `latitude=${lat}&longitude=${lon}&daily=${DAILY_VARS}&temperature_unit=${tempUnit}&timezone=auto`;
    const todayStr = new Date().toISOString().split('T')[0];

    let daily: OpenMeteoDaily;

    if (endDate < todayStr) {
      // Entire range is in the past — use the historical archive endpoint
      daily = await fetchOM(`${OM_ARCHIVE}?${baseParams}&start_date=${startDate}&end_date=${endDate}`);
    } else if (startDate >= todayStr) {
      // Entire range is today or future — use the forecast endpoint
      daily = await fetchOM(`${OM_FORECAST}?${baseParams}&start_date=${startDate}&end_date=${endDate}`);
    } else {
      // Range spans past and future — split at today and merge both results
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const [archiveDaily, forecastDaily] = await Promise.all([
        fetchOM(`${OM_ARCHIVE}?${baseParams}&start_date=${startDate}&end_date=${yesterdayStr}`),
        fetchOM(`${OM_FORECAST}?${baseParams}&start_date=${todayStr}&end_date=${endDate}`),
      ]);
      daily = mergeDaily(archiveDaily, forecastDaily);
    }

    // Shape each day's row into the format stored in the database
    const temperature_data = daily.time.map((date, i) => {
      const hi = daily.temperature_2m_max[i];
      const lo = daily.temperature_2m_min[i];
      return {
        date,
        temp_max: hi != null ? Math.round(hi * 10) / 10 : null,
        temp_min: lo != null ? Math.round(lo * 10) / 10 : null,
        // Average is the midpoint of high and low for the day
        temp_avg: hi != null && lo != null ? Math.round(((hi + lo) / 2) * 10) / 10 : null,
        precipitation: daily.precipitation_sum[i] != null ? Math.round(daily.precipitation_sum[i]! * 10) / 10 : null,
        windspeed_max: daily.windspeed_10m_max[i] != null ? Math.round(daily.windspeed_10m_max[i]! * 10) / 10 : null,
      };
    });

    return NextResponse.json({ city_name: name, country, latitude: lat, longitude: lon, temperature_data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch weather data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

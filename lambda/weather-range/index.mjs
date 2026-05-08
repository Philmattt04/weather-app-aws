/**
 * Lambda: weather-range
 * GET /weather-range?location=...&start_date=...&end_date=...&units=...
 *       or ?lat=...&lon=...&start_date=...&end_date=...&units=...
 *
 * Fetches daily temperature data via Open-Meteo (free, no API key).
 * Geocodes text queries using OpenWeatherMap. Supports dates from 1940
 * to 16 days ahead, splitting mixed past/future ranges automatically.
 */

const OWM_KEY    = process.env.OPENWEATHER_API_KEY;
const OM_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const OM_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const DAILY_VARS  = 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max';
const CORS        = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

const ok  = (data) => ({ statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const err = (s, m) => ({ statusCode: s,   headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: m }) });

function mergeDaily(a, b) {
  return {
    time:                 [...a.time,                 ...b.time],
    temperature_2m_max:  [...a.temperature_2m_max,   ...b.temperature_2m_max],
    temperature_2m_min:  [...a.temperature_2m_min,   ...b.temperature_2m_min],
    precipitation_sum:   [...a.precipitation_sum,    ...b.precipitation_sum],
    windspeed_10m_max:   [...a.windspeed_10m_max,    ...b.windspeed_10m_max],
  };
}

async function fetchOM(url) {
  const res  = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.reason || 'Open-Meteo error');
  return data.daily;
}

export const handler = async (event) => {
  const p = event.queryStringParameters || {};
  const { location, lat: dLat, lon: dLon, start_date, end_date, units = 'imperial' } = p;

  if ((!location && (!dLat || !dLon)) || !start_date || !end_date)
    return err(400, 'location (or lat+lon), start_date, and end_date are required');

  const start = new Date(start_date + 'T00:00:00');
  const end   = new Date(end_date   + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return err(400, 'Invalid date format — use YYYY-MM-DD');
  if (end < start)            return err(400, 'End date must be on or after start date');
  if (Math.ceil((end - start) / 86400000) + 1 > 30) return err(400, 'Date range cannot exceed 30 days');

  const maxFuture = new Date();
  maxFuture.setDate(maxFuture.getDate() + 16);
  if (end > maxFuture) return err(400, 'End date cannot be more than 16 days in the future');

  try {
    let lat, lon, name, country;

    if (dLat && dLon) {
      lat = parseFloat(dLat); lon = parseFloat(dLon);
      name = location ?? `${lat}, ${lon}`; country = '';
    } else {
      const geoRes  = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${OWM_KEY}`);
      const geoData = await geoRes.json();
      if (!Array.isArray(geoData) || !geoData.length)
        return err(404, 'Location not found. Try adding a country code (e.g. "Paris,FR").');
      ({ lat, lon, name, country } = geoData[0]);
    }

    const tempUnit   = units === 'imperial' ? 'fahrenheit' : 'celsius';
    const baseParams = `latitude=${lat}&longitude=${lon}&daily=${DAILY_VARS}&temperature_unit=${tempUnit}&timezone=auto`;
    const today      = new Date().toISOString().split('T')[0];

    let daily;
    if (end_date < today) {
      daily = await fetchOM(`${OM_ARCHIVE}?${baseParams}&start_date=${start_date}&end_date=${end_date}`);
    } else if (start_date >= today) {
      daily = await fetchOM(`${OM_FORECAST}?${baseParams}&start_date=${start_date}&end_date=${end_date}`);
    } else {
      const yesterday    = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const [arc, fcs]  = await Promise.all([
        fetchOM(`${OM_ARCHIVE}?${baseParams}&start_date=${start_date}&end_date=${yesterdayStr}`),
        fetchOM(`${OM_FORECAST}?${baseParams}&start_date=${today}&end_date=${end_date}`),
      ]);
      daily = mergeDaily(arc, fcs);
    }

    const temperature_data = daily.time.map((date, i) => {
      const hi = daily.temperature_2m_max[i], lo = daily.temperature_2m_min[i];
      return {
        date,
        temp_max:       hi != null ? Math.round(hi * 10) / 10 : null,
        temp_min:       lo != null ? Math.round(lo * 10) / 10 : null,
        temp_avg:       hi != null && lo != null ? Math.round(((hi + lo) / 2) * 10) / 10 : null,
        precipitation:  daily.precipitation_sum[i]  != null ? Math.round(daily.precipitation_sum[i]  * 10) / 10 : null,
        windspeed_max:  daily.windspeed_10m_max[i]  != null ? Math.round(daily.windspeed_10m_max[i]  * 10) / 10 : null,
      };
    });

    return ok({ city_name: name, country, latitude: lat, longitude: lon, temperature_data });
  } catch (e) {
    return err(500, e.message || 'Failed to fetch weather data');
  }
};

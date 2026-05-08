/**
 * Lambda: weather
 * GET /weather?type=current|forecast&q=...&lat=...&lon=...&units=...
 *
 * Proxies to OpenWeatherMap keeping the API key server-side in Lambda env vars.
 */

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE    = 'https://api.openweathermap.org';
const CORS    = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

const ok  = (data)  => ({ statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const err = (s, m)  => ({ statusCode: s,   headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: m }) });

export const handler = async (event) => {
  if (!API_KEY) return err(500, 'Weather service not configured');

  const p = event.queryStringParameters || {};
  const { type, q, lat, lon, units = 'imperial' } = p;

  const locPart = (lat && lon) ? `lat=${lat}&lon=${lon}` : q ? `q=${encodeURIComponent(q)}` : null;
  if (!locPart) return err(400, 'Query or coordinates required');

  let endpoint;
  if      (type === 'current')  endpoint = `/data/2.5/weather?${locPart}&units=${units}&appid=${API_KEY}`;
  else if (type === 'forecast') endpoint = `/data/2.5/forecast?${locPart}&units=${units}&appid=${API_KEY}`;
  else return err(400, 'Invalid type — use current or forecast');

  try {
    const res  = await fetch(`${BASE}${endpoint}`);
    const data = await res.json();
    if (!res.ok) {
      const msg = data.cod === '404' ? 'Location not found.' : data.message || 'Weather API error';
      return err(res.status, msg);
    }
    return ok(data);
  } catch {
    return err(500, 'Weather service unavailable');
  }
};

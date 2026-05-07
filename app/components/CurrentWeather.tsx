/**
 * CurrentWeather component
 *
 * Displays the live weather conditions for a searched location including:
 *   - City name, country, and coordinates
 *   - Current temperature, feels-like, high/low
 *   - Weather icon (served by OpenWeatherMap's CDN)
 *   - Detail stats: humidity, wind speed/direction, visibility, pressure, sunrise/sunset
 *   - An embedded OpenStreetMap iframe centered on the location (no API key required)
 *
 * Wind direction is converted from degrees (0–360) to a compass label (N, NNE, NE, …)
 * Sunrise/sunset Unix timestamps are converted to local time using the location's
 * UTC offset (data.timezone) rather than the user's browser timezone.
 */

import type { WeatherData } from '../types/weather';

interface Props {
  data: WeatherData;
  units: 'imperial' | 'metric';
}

// 16-point compass rose — index by rounding (degrees / 22.5) mod 16
const WIND_DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

function windDir(deg: number) {
  return WIND_DIRS[Math.round(deg / 22.5) % 16];
}

/**
 * Format a Unix timestamp as HH:MM using the location's own UTC offset.
 * We add the timezone offset to the Unix time then read UTC hours/minutes,
 * which gives us the local time at the weather location regardless of the
 * user's browser timezone.
 */
function formatTime(unix: number, tzOffset: number) {
  const d = new Date((unix + tzOffset) * 1000);
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function CurrentWeather({ data, units }: Props) {
  const icon = data.weather[0]?.icon;
  const tempUnit = units === 'imperial' ? '°F' : '°C';
  const speedUnit = units === 'imperial' ? 'mph' : 'm/s';

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-white">
      {/* Location header with weather icon */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">
            {data.name}, {data.sys.country}
          </h2>
          <p className="text-blue-200 capitalize mt-1">{data.weather[0]?.description}</p>
          <p className="text-blue-300 text-sm mt-1">
            📍 {data.coord.lat.toFixed(2)}, {data.coord.lon.toFixed(2)}
          </p>
        </div>
        {/* Icon URL format: https://openweathermap.org/img/wn/{icon}@2x.png */}
        {icon && (
          <img
            src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
            alt={data.weather[0]?.description}
            className="w-20 h-20"
          />
        )}
      </div>

      {/* Primary temperature display */}
      <div className="mt-4 flex items-end gap-6 flex-wrap">
        <span className="text-7xl font-thin">
          {Math.round(data.main.temp)}{tempUnit}
        </span>
        <div className="text-blue-200 text-sm space-y-1 mb-2">
          <p>Feels like {Math.round(data.main.feels_like)}{tempUnit}</p>
          <p>
            H: {Math.round(data.main.temp_max)}{tempUnit}&nbsp;&nbsp;
            L: {Math.round(data.main.temp_min)}{tempUnit}
          </p>
        </div>
      </div>

      {/* Secondary stats grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon="💧" label="Humidity" value={`${data.main.humidity}%`} />
        <Stat
          icon="💨"
          label="Wind"
          value={`${Math.round(data.wind.speed)} ${speedUnit} ${windDir(data.wind.deg)}`}
        />
        <Stat
          icon="👁️"
          label="Visibility"
          value={`${(data.visibility / 1000).toFixed(1)} km`}
        />
        <Stat icon="🌡️" label="Pressure" value={`${data.main.pressure} hPa`} />
        <Stat icon="🌅" label="Sunrise" value={formatTime(data.sys.sunrise, data.timezone)} />
        <Stat icon="🌇" label="Sunset" value={formatTime(data.sys.sunset, data.timezone)} />
      </div>

      {/*
       * OpenStreetMap embed — free, no API key needed.
       * bbox is set to ±0.08° around the location (~9 km) to show neighbourhood context.
       * The marker pin is placed at the exact coordinates.
       */}
      <div className="mt-5 rounded-xl overflow-hidden border border-white/10" style={{ height: 220 }}>
        <iframe
          title="Location map"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.coord.lon - 0.08},${data.coord.lat - 0.08},${data.coord.lon + 0.08},${data.coord.lat + 0.08}&layer=mapnik&marker=${data.coord.lat},${data.coord.lon}`}
          className="w-full h-full"
          loading="lazy"
        />
      </div>
    </div>
  );
}

// Small reusable stat tile used in the details grid
function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="text-blue-300 text-xs">{icon} {label}</p>
      <p className="text-white font-medium mt-1 text-sm">{value}</p>
    </div>
  );
}

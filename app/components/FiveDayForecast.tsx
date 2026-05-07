/**
 * FiveDayForecast component
 *
 * Displays a 5-day weather forecast as a responsive grid of cards.
 *
 * The OpenWeatherMap /forecast endpoint returns 40 data points spaced 3 hours
 * apart (8 per day × 5 days). getDailyForecasts reduces this to one entry per
 * calendar day by preferring the noon (12:00:00) slot — noon best represents
 * the day's conditions. If no noon slot exists (e.g. the first partial day),
 * it falls back to the first available slot for that date.
 */

import type { ForecastData, ForecastItem } from '../types/weather';

interface Props {
  data: ForecastData;
  units: 'imperial' | 'metric';
}

/**
 * Reduce the 40-item 3-hourly list to one representative item per day.
 * Iterates through all items; for each date, keeps the noon entry if found,
 * otherwise keeps the first entry seen for that date.
 * Returns the first 5 days so we always show a full 5-day forecast.
 */
function getDailyForecasts(list: ForecastItem[]): ForecastItem[] {
  const days = new Map<string, ForecastItem>();
  for (const item of list) {
    const date = item.dt_txt.split(' ')[0]; // extract YYYY-MM-DD from "YYYY-MM-DD HH:MM:SS"
    if (!days.has(date) || item.dt_txt.includes('12:00:00')) {
      days.set(date, item);
    }
  }
  return Array.from(days.values()).slice(0, 5);
}

// Format a forecast datetime string to a short day label like "Wed, May 7"
function formatDay(dt_txt: string) {
  return new Date(dt_txt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function FiveDayForecast({ data, units }: Props) {
  const days = getDailyForecasts(data.list);
  const tempUnit = units === 'imperial' ? '°F' : '°C';
  const speedUnit = units === 'imperial' ? 'mph' : 'm/s';

  return (
    <div className="mt-4">
      <h3 className="text-white text-lg font-semibold mb-3">5-Day Forecast</h3>
      {/* 2 columns on mobile, 5 on sm+ so all cards are visible at once on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {days.map((item) => (
          <div
            key={item.dt}
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center text-white flex flex-col items-center"
          >
            <p className="text-blue-200 text-xs font-medium">{formatDay(item.dt_txt)}</p>
            {/* Weather icon from OpenWeatherMap CDN */}
            <img
              src={`https://openweathermap.org/img/wn/${item.weather[0]?.icon}@2x.png`}
              alt={item.weather[0]?.description}
              className="w-12 h-12 my-1"
            />
            <p className="capitalize text-xs text-blue-200 mb-2">{item.weather[0]?.description}</p>
            <p className="text-2xl font-bold">{Math.round(item.main.temp)}{tempUnit}</p>
            <p className="text-xs text-blue-300 mt-1">
              H: {Math.round(item.main.temp_max)}{tempUnit} &nbsp; L: {Math.round(item.main.temp_min)}{tempUnit}
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-blue-300">
              <p>💧 {item.main.humidity}%</p>
              <p>💨 {Math.round(item.wind.speed)} {speedUnit}</p>
              {/* Only show rain probability when it's non-zero */}
              {item.pop > 0 && <p>🌧 {Math.round(item.pop * 100)}% rain</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

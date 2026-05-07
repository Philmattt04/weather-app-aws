/**
 * TypeScript interfaces for OpenWeatherMap API responses.
 *
 * WeatherData   — shape of the /data/2.5/weather endpoint (current conditions)
 * ForecastData  — shape of the /data/2.5/forecast endpoint (3-hourly, 5-day)
 * ForecastItem  — a single 3-hour slot within the forecast list
 * WeatherCondition — the weather[0] sub-object shared by both endpoints
 */

export interface WeatherCondition {
  id: number;           // OWM condition code (e.g. 800 = clear sky)
  main: string;         // group label (e.g. "Rain", "Snow", "Clear")
  description: string;  // human-readable description (e.g. "light rain")
  icon: string;         // icon code used to build the icon URL (e.g. "10d")
}

export interface WeatherData {
  name: string;         // city name resolved by OWM
  sys: {
    country: string;    // two-letter country code
    sunrise: number;    // Unix timestamp (UTC)
    sunset: number;
  };
  main: {
    temp: number;
    feels_like: number;
    humidity: number;   // percent
    temp_min: number;
    temp_max: number;
    pressure: number;   // hPa
  };
  weather: WeatherCondition[];
  wind: {
    speed: number;      // mph (imperial) or m/s (metric)
    deg: number;        // wind direction in degrees (0–360)
  };
  visibility: number;   // metres
  coord: {
    lat: number;
    lon: number;
  };
  dt: number;           // Unix timestamp of the data point
  timezone: number;     // UTC offset in seconds for the location
}

export interface ForecastItem {
  dt: number;
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    feels_like: number;
  };
  weather: WeatherCondition[];
  wind: {
    speed: number;
    deg: number;
  };
  dt_txt: string;       // human-readable datetime string, e.g. "2025-05-06 12:00:00"
  pop: number;          // probability of precipitation (0–1)
}

export interface ForecastData {
  list: ForecastItem[]; // 40 items: 8 per day × 5 days, spaced 3 hours apart
  city: {
    name: string;
    country: string;
    sunrise: number;
    sunset: number;
    timezone: number;
  };
}

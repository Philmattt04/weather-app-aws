'use client';

import { useState, useCallback, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import CurrentWeather from './components/CurrentWeather';
import FiveDayForecast from './components/FiveDayForecast';
import DateRangeForm from './components/DateRangeForm';
import WeatherHistory from './components/WeatherHistory';
import ExportPanel from './components/ExportPanel';
import YouTubeVideos from './components/YouTubeVideos';
import AIInsights from './components/AIInsights';
import AboutSection from './components/AboutSection';
import type { WeatherData, ForecastData } from './types/weather';
import type { WeatherRecord } from './types/records';

type SearchOpts = { q?: string; lat?: number; lon?: number };
type Tab = 'live' | 'history';

export default function Home() {
  const [tab, setTab] = useState<Tab>('live');

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial');
  const [lastSearch, setLastSearch] = useState<SearchOpts | null>(null);

  const [records, setRecords] = useState<WeatherRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const fetchWeather = useCallback(async (opts: SearchOpts, unitOverride?: 'imperial' | 'metric') => {
    const activeUnits = unitOverride ?? units;
    setLoading(true);
    setError(null);

    try {
      const locPart = opts.lat !== undefined
        ? `lat=${opts.lat}&lon=${opts.lon}`
        : `q=${encodeURIComponent(opts.q!)}`;
      const base = `/api/weather?units=${activeUnits}`;

      const [wRes, fRes] = await Promise.all([
        fetch(`${base}&type=current&${locPart}`),
        fetch(`${base}&type=forecast&${locPart}`),
      ]);

      if (!wRes.ok) {
        const { error: msg } = await wRes.json();
        throw new Error(msg || 'Location not found. Please try again.');
      }

      const [wData, fData] = await Promise.all([wRes.json(), fRes.ok ? fRes.json() : null]);
      setWeather(wData);
      setForecast(fData);
      setLastSearch(opts);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setError(message);
      setWeather(null);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, [units]);

  const handleSearch = (query: string, lat?: number, lon?: number) => {
    if (lat !== undefined && lon !== undefined) fetchWeather({ lat, lon });
    else fetchWeather({ q: query });
  };

  const toggleUnits = () => {
    const next = units === 'imperial' ? 'metric' : 'imperial';
    setUnits(next);
    if (lastSearch) fetchWeather(lastSearch, next);
  };

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await fetch('/api/records');
      if (res.ok) setRecords(await res.json());
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'history') loadRecords();
  }, [tab, loadRecords]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700">
      <div className="container mx-auto px-4 py-10 max-w-4xl">

        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white tracking-tight">Weather Dashboard</h1>
          <p className="text-blue-300 mt-2 text-sm tracking-wide">by Philippe Mathieu</p>
          <p className="text-blue-400 mt-1 text-xs">Powered by AWS Lambda · DynamoDB · Amazon Bedrock</p>
        </header>

        <div className="flex gap-1 bg-white/10 p-1 rounded-xl mb-6 w-fit mx-auto">
          {(['live', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                tab === t ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'
              }`}
            >
              {t === 'live' ? '🌤 Live Weather' : '📋 History & Export'}
            </button>
          ))}
        </div>

        {tab === 'live' && (
          <>
            <SearchBar onSearch={handleSearch} loading={loading} />

            {error && (
              <div className="mt-6 flex items-center gap-3 bg-red-500/20 border border-red-400/40 text-red-200 p-4 rounded-xl">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {loading && (
              <div className="mt-16 text-center">
                <div className="inline-block w-12 h-12 border-4 border-blue-300 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-blue-200 text-sm">Fetching weather data…</p>
              </div>
            )}

            {!loading && weather && (
              <div className="mt-6">
                <div className="flex justify-end mb-3">
                  <button
                    onClick={toggleUnits}
                    className="text-sm bg-white/10 hover:bg-white/20 transition text-white px-4 py-1.5 rounded-full border border-white/20"
                  >
                    Switch to {units === 'imperial' ? '°C / Metric' : '°F / Imperial'}
                  </button>
                </div>
                <CurrentWeather data={weather} units={units} />
                {forecast && <FiveDayForecast data={forecast} units={units} />}
                <AIInsights weatherData={weather} units={units} />
                <YouTubeVideos location={`${weather.name}, ${weather.sys.country}`} />
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <div className="space-y-5">
            <DateRangeForm onSaved={(r) => setRecords((prev) => [r, ...prev])} />
            {recordsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-blue-300 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <WeatherHistory
                records={records}
                onUpdate={(u) => setRecords((prev) => prev.map((r) => r.id === u.id ? u : r))}
                onDelete={(id) => setRecords((prev) => prev.filter((r) => r.id !== id))}
              />
            )}
            <ExportPanel />
          </div>
        )}

        <AboutSection />
      </div>
    </main>
  );
}

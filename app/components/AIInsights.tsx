"use client";

/**
 * AIInsights component
 *
 * Calls Amazon Bedrock (Claude 3 Haiku) via /api/ai-insights whenever the
 * searched location changes. Displays three sections:
 *   - Summary     — one-sentence weather overview
 *   - Activities  — 3 things to do given today's conditions
 *   - What to wear — 3 clothing/gear recommendations
 *
 * States:
 *   idle     — no weather searched yet, component is hidden
 *   loading  — spinner while Bedrock responds (~1-3s)
 *   success  — insights displayed in a glass card
 *   error    — silently hidden (Bedrock not enabled, quota exhausted, etc.)
 */

import { useState, useEffect } from "react";
import type { WeatherData } from "../types/weather";
import type { AIInsight } from "../types/ai";

interface Props {
  weatherData: WeatherData | null;
  units: "imperial" | "metric";
}

export default function AIInsights({ weatherData, units }: Props) {
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);

  // Re-fetch insights whenever the searched location or weather data changes
  useEffect(() => {
    if (!weatherData) return;
    setLoading(true);
    setInsight(null);

    const windDirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
    const windDir = windDirs[Math.round((weatherData.wind?.deg ?? 0) / 22.5) % 16];

    fetch("/api/ai-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: weatherData.name,
        country: weatherData.sys?.country,
        temperature: Math.round(weatherData.main.temp),
        feelsLike: Math.round(weatherData.main.feels_like),
        tempMax: Math.round(weatherData.main.temp_max),
        tempMin: Math.round(weatherData.main.temp_min),
        humidity: weatherData.main.humidity,
        windSpeed: Math.round(weatherData.wind?.speed ?? 0),
        windDir,
        visibility: ((weatherData.visibility ?? 0) / 1000).toFixed(1),
        pressure: weatherData.main.pressure,
        weatherDescription: weatherData.weather?.[0]?.description ?? "",
        units,
      }),
    })
      .then((r) => r.json())
      .then((data: AIInsight) => {
        // Only show the card if we got useful content
        if (data.summary || data.activities.length || data.clothing.length) {
          setInsight(data);
        }
      })
      .catch(() => {}) // fail silently — Bedrock may not be enabled
      .finally(() => setLoading(false));
  }, [weatherData, units]);

  if (!weatherData) return null;

  if (loading) {
    return (
      <div className="mt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 text-blue-200">
          <div className="w-5 h-5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-sm">Generating AI insights with Amazon Bedrock…</span>
        </div>
      </div>
    );
  }

  if (!insight) return null;

  return (
    <div className="mt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-white">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">✨</span>
        <h3 className="font-semibold text-lg">AI Weather Insights</h3>
        <span className="ml-auto text-xs text-blue-300 bg-white/10 px-2 py-0.5 rounded-full">
          Powered by Amazon Bedrock
        </span>
      </div>

      {/* Summary */}
      {insight.summary && (
        <p className="text-blue-100 text-sm leading-relaxed mb-5 border-l-2 border-blue-400 pl-3">
          {insight.summary}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Activity recommendations */}
        {insight.activities.length > 0 && (
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-2">
              🏃 Activities
            </p>
            <ul className="space-y-1.5">
              {insight.activities.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                  <span className="text-blue-100">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Clothing suggestions */}
        {insight.clothing.length > 0 && (
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-2">
              👗 What to Wear
            </p>
            <ul className="space-y-1.5">
              {insight.clothing.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-400 flex-shrink-0 mt-0.5">•</span>
                  <span className="text-blue-100">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

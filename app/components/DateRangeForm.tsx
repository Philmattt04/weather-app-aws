/**
 * DateRangeForm component
 *
 * Form that allows users to search temperature data for a specific location
 * over a custom date range and save the result to the Supabase database.
 *
 * Flow:
 *   1. User enters a location, start date, end date, units, and optional notes
 *   2. On submit, calls GET /api/weather-range which:
 *        a. Geocodes the location via OpenWeatherMap
 *        b. Fetches daily temperature data from Open-Meteo (supports 1940 → +16 days)
 *   3. Then calls POST /api/records to persist the result in Supabase
 *   4. Calls onSaved() so the parent can prepend the new record to the history list
 *
 * Date constraints enforced both in the UI (min/max on date inputs) and server-side:
 *   - Start must be on or before end
 *   - Max range: 30 days
 *   - Max future: 16 days ahead (Open-Meteo forecast limit)
 *   - Earliest historical: 1940-01-01 (Open-Meteo archive limit)
 */

'use client';

import { useState, FormEvent } from 'react';
import type { WeatherRecord } from '../types/records';
import { apiUrl } from '../lib/apiUrl';

interface Props {
  onSaved: (record: WeatherRecord) => void;
}

export default function DateRangeForm({ onSaved }: Props) {
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // today's date string for the date input min/max attributes
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 16);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validation before hitting the API
    if (!location.trim() || !startDate || !endDate) {
      setError('All fields are required.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be on or after start date.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: geocode location + fetch daily temp data from Open-Meteo
      const rangeRes = await fetch(
        apiUrl(`/weather-range?location=${encodeURIComponent(location)}&start_date=${startDate}&end_date=${endDate}&units=${units}`)
      );
      const rangeData = await rangeRes.json();
      if (!rangeRes.ok) throw new Error(rangeData.error || 'Failed to fetch weather data');

      // Step 2: persist the record in Supabase
      const saveRes = await fetch(apiUrl('/records'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_query: location.trim(),
          city_name: rangeData.city_name,
          country: rangeData.country,
          latitude: rangeData.latitude,
          longitude: rangeData.longitude,
          start_date: startDate,
          end_date: endDate,
          temperature_data: rangeData.temperature_data,
          units,
          notes: notes.trim(),
        }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error(saved.error || 'Failed to save record');

      setSuccess(`Saved! ${rangeData.city_name}, ${rangeData.country} — ${rangeData.temperature_data.length} days of data.`);
      // Reset the form after a successful save
      setLocation('');
      setStartDate('');
      setEndDate('');
      setNotes('');
      onSaved(saved); // notify parent to prepend the new record to the history table
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-white">
      <h3 className="text-lg font-semibold mb-4">Search by Date Range &amp; Save</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-blue-200 text-xs mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City name, zip code, or coordinates"
              disabled={loading}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-300/60 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>
          <div>
            <label className="block text-blue-200 text-xs mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min="1940-01-01"
              max={maxDateStr}
              disabled={loading}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-blue-200 text-xs mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || '1940-01-01'}
              max={maxDateStr}
              disabled={loading}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-blue-200 text-xs mb-1">Units</label>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value as 'imperial' | 'metric')}
              disabled={loading}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            >
              <option value="imperial" className="bg-slate-800">Imperial (°F)</option>
              <option value="metric" className="bg-slate-800">Metric (°C)</option>
            </select>
          </div>
          <div>
            <label className="block text-blue-200 text-xs mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note…"
              disabled={loading}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-300/60 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm"
        >
          {loading ? 'Fetching & Saving…' : 'Search & Save to Database'}
        </button>
      </form>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-4 py-2">
          <span>⚠️</span> {error}
        </div>
      )}
      {success && (
        <div className="mt-3 flex items-center gap-2 text-sm text-green-300 bg-green-500/10 border border-green-400/30 rounded-lg px-4 py-2">
          <span>✓</span> {success}
        </div>
      )}

      <p className="mt-3 text-blue-300/60 text-xs">
        Supports historical data (since 1940) and forecasts up to 16 days ahead. Max 30-day range.
      </p>
    </div>
  );
}

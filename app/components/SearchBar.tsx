/**
 * SearchBar component
 *
 * Provides two ways to look up a location:
 *   1. Text input — accepts city names, zip/postal codes, or GPS coordinates
 *      in "lat,lon" format (e.g. "25.76,-80.19"). The regex check decides which
 *      path to take before passing the query up to the parent.
 *   2. Geolocation button — uses the browser's navigator.geolocation API to
 *      detect the user's current position and passes the coordinates directly.
 *
 * The parent component (page.tsx) handles the actual API call; this component
 * only handles input collection and validation.
 */

'use client';

import { useState, FormEvent } from 'react';

interface Props {
  onSearch: (query: string, lat?: number, lon?: number) => void;
  loading: boolean;
}

// Matches "lat,lon" patterns like "25.76,-80.19" or "-33.87, 151.21"
const GPS_RE = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;

export default function SearchBar({ onSearch, loading }: Props) {
  const [input, setInput] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    // If the input looks like coordinates, extract them directly instead of geocoding
    const match = trimmed.match(GPS_RE);
    if (match) {
      onSearch('', parseFloat(match[1]), parseFloat(match[2]));
    } else {
      onSearch(trimmed); // city name, zip code, etc. — let OpenWeatherMap geocode it
    }
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        // Pass coordinates directly — no text query needed
        onSearch('', pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setGeoLoading(false);
        setGeoError('Unable to get location. Please allow location access and try again.');
      }
    );
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="City, zip code, or coordinates (lat, lon)…"
          disabled={loading}
          className="flex-1 bg-white/10 border border-white/20 text-white placeholder-blue-300/70 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          Search
        </button>
      </form>

      {/* Geolocation shortcut */}
      <button
        onClick={handleGeolocate}
        disabled={loading || geoLoading}
        className="flex items-center gap-2 text-sm text-blue-300 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className={geoLoading ? 'animate-spin inline-block' : ''}>
          {geoLoading ? '⟳' : '📍'}
        </span>
        {geoLoading ? 'Detecting location…' : 'Use my current location'}
      </button>

      {/* Show error if browser denied location permission */}
      {geoError && <p className="text-sm text-red-300">{geoError}</p>}
    </div>
  );
}

/**
 * YouTubeVideos component
 *
 * Fetches and displays travel videos for the currently searched location
 * using the YouTube Data API v3 (via the server-side /api/youtube route).
 *
 * Behaviour by state:
 *   - Loading  — renders 6 skeleton placeholder cards with a pulse animation
 *   - Error or empty — returns null (hides the section entirely, no error shown to user)
 *   - Success  — renders a 2×3 grid of video cards
 *
 * Each card shows the video thumbnail with a YouTube-style play button overlay.
 * Clicking opens the video on YouTube in a new tab rather than embedding inline,
 * which avoids iframe autoplay restrictions and keeps the page lightweight.
 *
 * The fetch is re-triggered whenever the location prop changes (new city searched).
 * Results are cached server-side for 1 hour to conserve YouTube API quota.
 */

'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '../lib/apiUrl';

interface Video {
  videoId: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface Props {
  location: string; // e.g. "Miami, US" — passed from the resolved weather data
}

export default function YouTubeVideos({ location }: Props) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Re-fetch whenever the searched location changes
  useEffect(() => {
    if (!location) return;
    setLoading(true);
    setError(false);
    setVideos([]);

    fetch(apiUrl(`/youtube?q=${encodeURIComponent(location)}`))
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setVideos(data);
      })
      .catch(() => setError(true)) // hide the section silently on any error
      .finally(() => setLoading(false));
  }, [location]);

  // Don't render the section at all if there's nothing to show
  if (error || (!loading && !videos.length)) return null;

  return (
    <div className="mt-4">
      <h3 className="text-white text-lg font-semibold mb-3">
        📺 Videos about {location}
      </h3>

      {loading ? (
        // Skeleton placeholders maintain layout while the API call is in flight
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/10 border border-white/10 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-video bg-white/10" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-white/10 rounded w-full" />
                <div className="h-3 bg-white/10 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {videos.map((video) => (
            <a
              key={video.videoId}
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white/10 border border-white/20 hover:border-white/40 rounded-xl overflow-hidden transition"
            >
              <div className="relative aspect-video">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                {/* Play button overlay — darkens on hover to indicate interactivity */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.84A1 1 0 005 3.75v12.5a1 1 0 001.3.95l12-6.25a1 1 0 000-1.9L6.3 2.84z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-white text-xs font-medium line-clamp-2 leading-tight">{video.title}</p>
                <p className="text-blue-300 text-xs mt-1 truncate">{video.channel}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

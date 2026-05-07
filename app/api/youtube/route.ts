/**
 * API Route: /api/youtube
 *
 * Searches YouTube Data API v3 for travel videos related to a location.
 * Running this server-side keeps the Google API key out of the browser bundle.
 *
 * Results are cached for 1 hour — video search results for a city change rarely,
 * so we avoid burning through the 10,000 unit/day free quota unnecessarily.
 *
 * Query parameters:
 *   q - location name (e.g. "Miami, US"). Appends " travel" to the search query.
 *
 * Returns an array of { videoId, title, thumbnail, channel } objects.
 * Returns 503 (not 500) when the API key is missing so the client can
 * silently hide the section rather than showing an error.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  const apiKey = process.env.YOUTUBE_API_KEY;
  // 503 signals "feature not configured" so the YouTubeVideos component hides itself gracefully
  if (!apiKey) return NextResponse.json({ error: 'YouTube API not configured' }, { status: 503 });

  try {
    const res = await fetch(
      // Append "travel" to get destination/tourism content rather than weather forecasts
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' travel')}&type=video&maxResults=6&videoEmbeddable=true&relevanceLanguage=en&key=${apiKey}`,
      // Cache results for 1 hour to preserve the free-tier daily quota
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    // Extract only the fields the UI needs — keeps the response payload small
    const videos = (data.items ?? []).map((item: {
      id: { videoId: string };
      snippet: {
        title: string;
        thumbnails: { medium: { url: string } };
        channelTitle: string;
      };
    }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channel: item.snippet.channelTitle,
    }));

    return NextResponse.json(videos);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch videos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

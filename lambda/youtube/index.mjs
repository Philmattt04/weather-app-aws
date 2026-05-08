/**
 * Lambda: youtube
 * GET /youtube?q=...
 *
 * Searches YouTube Data API v3 for travel videos, keeping the key server-side.
 */

const API_KEY = process.env.YOUTUBE_API_KEY;
const CORS    = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

const ok  = (data) => ({ statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const err = (s, m) => ({ statusCode: s,   headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: m }) });

export const handler = async (event) => {
  const q = event.queryStringParameters?.q;
  if (!q)      return err(400, 'Query required');
  if (!API_KEY) return err(503, 'YouTube API not configured');

  try {
    const res  = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q + ' travel')}&type=video&maxResults=6&videoEmbeddable=true&relevanceLanguage=en&key=${API_KEY}`
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const videos = (data.items ?? []).map(item => ({
      videoId:   item.id.videoId,
      title:     item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channel:   item.snippet.channelTitle,
    }));
    return ok(videos);
  } catch (e) {
    return err(500, e.message || 'Failed to fetch videos');
  }
};

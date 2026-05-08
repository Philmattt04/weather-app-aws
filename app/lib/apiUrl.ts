/**
 * API Gateway base URL helper for static/client-side rendering.
 * NEXT_PUBLIC_API_GATEWAY_URL is baked in at build time.
 * All Lambda functions include CORS headers, so direct browser calls are safe.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? '';
export const apiUrl   = (path: string) => `${API_BASE}${path}`;

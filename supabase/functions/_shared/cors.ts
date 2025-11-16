/**
 * Get CORS headers with configurable origin
 * Defaults to localhost for development
 * Set ALLOWED_ORIGIN environment variable for production
 */
export function getCorsHeaders(): Record<string, string> {
  // Get allowed origin from environment, default to wildcard for development
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';

  // Log for debugging (only in development)
  if (allowedOrigin === '*') {
    console.log('CORS: Allowing all origins (development mode)');
  } else {
    console.log('CORS: Restricted to:', allowedOrigin);
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders()
  });
}

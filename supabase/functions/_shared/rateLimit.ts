import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rate limits per endpoint (calls per day)
const RATE_LIMITS: Record<string, number> = {
  'extract-meeting-intelligence': 10,
  'generate-prep-brief': 20,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
}

/**
 * Check if user has exceeded rate limit for endpoint
 * Increments counter if within limit
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  const limit = RATE_LIMITS[endpoint] || 100; // Default: 100/day
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Try to get existing usage record for today
    const { data: usage, error: fetchError } = await supabase
      .from('user_api_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .eq('period_start', today)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching usage:', fetchError);
      throw fetchError;
    }

    // Calculate reset time (tomorrow at midnight UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    const resetAt = tomorrow.toISOString();

    // No usage record for today - create one
    if (!usage) {
      const { error: insertError } = await supabase
        .from('user_api_usage')
        .insert({
          user_id: userId,
          endpoint,
          call_count: 1,
          period_start: today
        });

      if (insertError) {
        console.error('Error creating usage record:', insertError);
        // If insert fails due to race condition, retry the check
        if (insertError.code === '23505') {
          return checkRateLimit(supabase, userId, endpoint);
        }
        throw insertError;
      }

      return {
        allowed: true,
        remaining: limit - 1,
        limit,
        resetAt
      };
    }

    // Check if limit exceeded
    if (usage.call_count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetAt
      };
    }

    // Increment counter
    const { error: updateError } = await supabase
      .from('user_api_usage')
      .update({
        call_count: usage.call_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', usage.id);

    if (updateError) {
      console.error('Error updating usage:', updateError);
      throw updateError;
    }

    return {
      allowed: true,
      remaining: limit - usage.call_count - 1,
      limit,
      resetAt
    };

  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request (fail open)
    // This prevents rate limiting from breaking the service
    return {
      allowed: true,
      remaining: 999,
      limit: 999,
      resetAt: new Date().toISOString()
    };
  }
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>) {
  const resetDate = new Date(result.resetAt);
  const hoursUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60));

  return new Response(
    JSON.stringify({
      error: 'Rate Limit Exceeded',
      message: `You have reached your daily limit of ${result.limit} requests for this feature. ` +
        `Your limit will reset in ${hoursUntilReset} hours at ${resetDate.toUTCString()}.`,
      limit: result.limit,
      remaining: 0,
      resetAt: result.resetAt,
      retryAfter: Math.ceil((resetDate.getTime() - Date.now()) / 1000) // seconds
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt,
        'Retry-After': String(Math.ceil((resetDate.getTime() - Date.now()) / 1000))
      }
    }
  );
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult
): Record<string, string> {
  return {
    ...headers,
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.resetAt
  };
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  userId: string;
  error?: string;
}

/**
 * Verify JWT token and extract user ID
 * Returns userId on success, or error message on failure
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return { userId: '', error: 'Missing authorization header' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { userId: '', error: 'Invalid authorization header format' };
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify token with Supabase
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { userId: '', error: 'Invalid or expired token' };
  }

  return { userId: user.id };
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized', corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: message
    }),
    {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

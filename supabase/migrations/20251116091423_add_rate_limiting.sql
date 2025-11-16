-- Create user API usage tracking table for rate limiting
CREATE TABLE IF NOT EXISTS public.user_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint, period_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_api_usage_user_endpoint
ON public.user_api_usage(user_id, endpoint);

CREATE INDEX IF NOT EXISTS idx_user_api_usage_period
ON public.user_api_usage(period_start DESC);

-- Enable RLS
ALTER TABLE public.user_api_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own usage"
ON public.user_api_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service role can insert/update (rate limiting is done server-side)
CREATE POLICY "Service role can manage usage"
ON public.user_api_usage
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER set_user_api_usage_updated_at
BEFORE UPDATE ON public.user_api_usage
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add comment
COMMENT ON TABLE public.user_api_usage IS 'Tracks API usage per user per endpoint per day for rate limiting';

-- Add AI extraction fields to meetings table
ALTER TABLE public.meetings
ADD COLUMN stakeholders JSONB DEFAULT '[]'::jsonb,
ADD COLUMN quotes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN objections JSONB DEFAULT '[]'::jsonb,
ADD COLUMN risks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN approval_clues JSONB DEFAULT '[]'::jsonb,
ADD COLUMN extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN extraction_error TEXT;
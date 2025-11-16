-- Add debrief field to simulations table
ALTER TABLE public.simulations 
ADD COLUMN debrief JSONB DEFAULT NULL;

COMMENT ON COLUMN public.simulations.debrief IS 'AI-generated debrief containing: what_went_well, what_didnt, likely_outcomes, next_steps';
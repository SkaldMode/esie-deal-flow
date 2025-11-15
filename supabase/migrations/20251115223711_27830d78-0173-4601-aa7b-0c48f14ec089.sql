-- Add stage field to deals table
ALTER TABLE public.deals 
ADD COLUMN stage TEXT NOT NULL DEFAULT 'Discovery' 
CHECK (stage IN ('Discovery', 'Demo', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'));
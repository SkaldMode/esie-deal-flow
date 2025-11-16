-- Create stakeholder relationships table
CREATE TABLE public.stakeholder_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  to_stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'reports_to', 'influences', 'collaborates_with'
  confidence NUMERIC DEFAULT 0.5, -- AI confidence score 0-1
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(from_stakeholder_id, to_stakeholder_id, relationship_type),
  CHECK (from_stakeholder_id != to_stakeholder_id) -- Prevent self-relationships
);

-- Enable RLS
ALTER TABLE public.stakeholder_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view relationships for their deals"
  ON public.stakeholder_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE deals.id = stakeholder_relationships.deal_id
      AND deals.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage relationships"
  ON public.stakeholder_relationships FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_stakeholder_relationships_deal ON public.stakeholder_relationships(deal_id);
CREATE INDEX idx_stakeholder_relationships_from ON public.stakeholder_relationships(from_stakeholder_id);
CREATE INDEX idx_stakeholder_relationships_to ON public.stakeholder_relationships(to_stakeholder_id);
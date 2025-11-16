-- Add essential indexes for performance

-- Index for querying meetings by deal
CREATE INDEX IF NOT EXISTS idx_meetings_deal_id ON public.meetings(deal_id);

-- Index for querying stakeholders by deal
CREATE INDEX IF NOT EXISTS idx_stakeholders_deal_id ON public.stakeholders(deal_id);

-- Index for querying deals by user and status (for archived deals page)
CREATE INDEX IF NOT EXISTS idx_deals_user_status ON public.deals(user_id, status);

-- Index for ordering meetings by date within a deal
CREATE INDEX IF NOT EXISTS idx_meetings_deal_date ON public.meetings(deal_id, meeting_date DESC);

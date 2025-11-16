-- Create stakeholders table for persistent profiles
CREATE TABLE public.stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  department TEXT,
  stance TEXT, -- positive, neutral, negative
  power TEXT, -- high, medium, low
  communication_style TEXT, -- AI can suggest communication approach
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(deal_id, name, role_title) -- Prevent duplicates per deal
);

-- Enable RLS
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stakeholders
CREATE POLICY "Users can view their own stakeholders"
  ON public.stakeholders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stakeholders"
  ON public.stakeholders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stakeholders"
  ON public.stakeholders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stakeholders"
  ON public.stakeholders FOR DELETE
  USING (auth.uid() = user_id);

-- Junction table for stakeholder-meeting relationships
CREATE TABLE public.stakeholder_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(stakeholder_id, meeting_id) -- Prevent duplicate mentions
);

-- Enable RLS for mentions
ALTER TABLE public.stakeholder_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentions (read-only for users via joins)
CREATE POLICY "Users can view stakeholder mentions through stakeholders"
  ON public.stakeholder_mentions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stakeholders
      WHERE stakeholders.id = stakeholder_mentions.stakeholder_id
      AND stakeholders.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage mentions"
  ON public.stakeholder_mentions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at on stakeholders
CREATE TRIGGER update_stakeholders_updated_at
  BEFORE UPDATE ON public.stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
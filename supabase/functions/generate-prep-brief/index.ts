import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitResponse, addRateLimitHeaders } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth(req);
    if (authError) {
      console.error('Auth error:', authError);
      return unauthorizedResponse(authError, corsHeaders);
    }

    const { dealId } = await req.json();

    if (!dealId) {
      return new Response(
        JSON.stringify({ error: 'Missing dealId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generate prep brief request:', { dealId, userId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check rate limit
    const rateLimitResult = await checkRateLimit(supabase, userId, 'generate-prep-brief');
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Fetch deal details
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError) throw dealError;

    // Fetch stakeholders
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('deal_id', dealId)
      .order('power', { ascending: false });

    if (stakeholdersError) throw stakeholdersError;

    // Fetch recent meetings (last 3)
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('*')
      .eq('deal_id', dealId)
      .order('meeting_date', { ascending: false })
      .limit(3);

    if (meetingsError) throw meetingsError;

    // Aggregate risks from recent meetings
    const allRisks = meetings?.flatMap(m => m.risks || []) || [];
    
    // Aggregate objections
    const allObjections = meetings?.flatMap(m => m.objections || []) || [];

    // Build context for AI
    const stakeholderContext = stakeholders?.map(s => 
      `${s.name} (${s.role_title}${s.department ? ', ' + s.department : ''}):\n` +
      `- Stance: ${s.stance || 'unknown'}\n` +
      `- Power: ${s.power || 'unknown'}\n` +
      `- Communication Style: ${s.communication_style || 'not specified'}`
    ).join('\n\n') || 'No stakeholders identified yet';

    const lastMeetingSummary = meetings?.[0] ? 
      `Date: ${meetings[0].meeting_date}\n` +
      `Title: ${meetings[0].title}\n` +
      `Notes: ${meetings[0].raw_notes.substring(0, 500)}...\n` +
      `Key Quotes: ${JSON.stringify(meetings[0].quotes?.slice(0, 3) || [])}` 
      : 'No previous meetings recorded';

    const risksSummary = allRisks.length > 0 ?
      allRisks.slice(0, 5).map((r: any) => `[${r.severity}] ${r.risk_description}`).join('\n')
      : 'No risks identified';

    const objectionsSummary = allObjections.length > 0 ?
      allObjections.slice(0, 3).map((o: any) => `${o.objection_text} (from: ${o.source_name})`).join('\n')
      : 'No objections recorded';

    const systemPrompt = `You are a sales coach preparing a sales representative for an upcoming meeting.

Deal Context:
- Company: ${deal.account_name}
- Deal Value: ${deal.deal_value} ${deal.currency}
- Stage: ${deal.stage}
- Expected Close: ${deal.expected_close_month}

Stakeholders:
${stakeholderContext}

Last Meeting Summary:
${lastMeetingSummary}

Identified Risks:
${risksSummary}

Previous Objections:
${objectionsSummary}

Generate a comprehensive prep brief in JSON format with the following structure:

{
  "executive_summary": "2-3 sentence overview of the deal status and meeting readiness",
  "stakeholder_summary": [
    {
      "name": "string",
      "role": "string",
      "stance": "string",
      "key_point": "one key thing to remember about this person"
    }
  ],
  "risks_to_address": [
    {
      "risk": "description",
      "severity": "high|medium|low",
      "mitigation": "suggested approach to handle this"
    }
  ],
  "last_meeting_key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "recommended_questions": [
    {
      "question": "the question to ask",
      "purpose": "why this question matters",
      "stakeholder": "who to ask (if specific)"
    }
  ],
  "meeting_objectives": ["objective 1", "objective 2", "objective 3"],
  "prep_notes": ["quick tip 1", "quick tip 2"]
}

Be specific, actionable, and strategic. Focus on moving the deal forward.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const briefContent = aiData.choices?.[0]?.message?.content;

    if (!briefContent) {
      throw new Error('No brief generated');
    }

    const brief = JSON.parse(briefContent);

    return new Response(
      JSON.stringify({
        brief,
        dealInfo: {
          account_name: deal.account_name,
          deal_value: deal.deal_value,
          currency: deal.currency,
          stage: deal.stage,
          expected_close_month: deal.expected_close_month
        },
        generatedAt: new Date().toISOString()
      }),
      {
        headers: addRateLimitHeaders(
          { ...corsHeaders, 'Content-Type': 'application/json' },
          rateLimitResult
        )
      }
    );

  } catch (error) {
    console.error('Generate prep brief error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Brief generation failed';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, dealId } = await req.json();

    console.log('Update stakeholder insights:', { meetingId, dealId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError) throw meetingError;

    // Get all stakeholders for this deal
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('deal_id', dealId);

    if (stakeholdersError) throw stakeholdersError;

    if (!stakeholders || stakeholders.length === 0) {
      console.log('No stakeholders found for deal');
      return new Response(
        JSON.stringify({ message: 'No stakeholders to update' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all previous meetings for context
    const { data: previousMeetings, error: prevMeetingsError } = await supabase
      .from('meetings')
      .select('*')
      .eq('deal_id', dealId)
      .order('meeting_date', { ascending: false })
      .limit(5);

    if (prevMeetingsError) throw prevMeetingsError;

    // Build context for AI
    const meetingHistory = previousMeetings?.map(m => ({
      date: m.meeting_date,
      notes: m.raw_notes,
      quotes: m.quotes || [],
      objections: m.objections || [],
    })) || [];

    const systemPrompt = `You are analyzing meeting notes to update stakeholder intelligence in a B2B sales context.

Based on the meeting history, update each stakeholder's:
1. **stance**: "positive" (supportive/champion), "neutral" (needs convincing), or "negative" (opposes/blocker)
2. **power**: "low" (influencer), "medium" (decision maker), or "high" (executive sponsor/blocker)
3. **communication_style**: brief description of how they communicate

Current Stakeholders:
${stakeholders.map(s => `- ${s.name} (${s.role_title}): Current stance=${s.stance}, power=${s.power}`).join('\n')}

Meeting History:
${meetingHistory.map(m => `Date: ${m.date}\nNotes: ${m.notes}\nQuotes: ${JSON.stringify(m.quotes)}\nObjections: ${JSON.stringify(m.objections)}`).join('\n\n')}

Return a JSON object with updates ONLY for stakeholders mentioned or implied in the meetings. Format:
{
  "updates": [
    {
      "stakeholder_id": "uuid",
      "stance": "positive|neutral|negative",
      "power": "low|medium|high",
      "communication_style": "brief description",
      "reasoning": "why these changes were made"
    }
  ]
}

Only include stakeholders that have new information from the meetings. If no updates are needed, return empty updates array.`;

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
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisContent = aiData.choices?.[0]?.message?.content;

    if (!analysisContent) {
      throw new Error('No analysis generated');
    }

    const analysis = JSON.parse(analysisContent);
    console.log('AI Analysis:', analysis);

    // Update stakeholders
    const updatePromises = analysis.updates?.map(async (update: any) => {
      const stakeholder = stakeholders.find(s => s.id === update.stakeholder_id);
      if (!stakeholder) return null;

      console.log(`Updating ${stakeholder.name}:`, update);

      const { error: updateError } = await supabase
        .from('stakeholders')
        .update({
          stance: update.stance,
          power: update.power,
          communication_style: update.communication_style,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.stakeholder_id);

      if (updateError) {
        console.error('Error updating stakeholder:', updateError);
        return null;
      }

      return update;
    }) || [];

    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter(r => r !== null);

    return new Response(
      JSON.stringify({ 
        message: 'Stakeholder insights updated',
        updatedCount: successfulUpdates.length,
        updates: successfulUpdates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update stakeholder insights error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Update failed';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

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
    const { simulationId } = await req.json();

    console.log('Generate debrief request:', { simulationId });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get simulation with transcript
    const { data: simulation, error: simError } = await supabase
      .from('simulations')
      .select('*, deals(*)')
      .eq('id', simulationId)
      .single();

    if (simError) throw simError;

    const transcript = simulation?.transcript || [];
    
    // Format transcript for analysis
    const conversationText = transcript
      .map((msg: any) => `${msg.role === 'user' ? 'Sales Rep' : 'Stakeholder(s)'}: ${msg.content}`)
      .join('\n\n');

    const systemPrompt = `You are an expert sales coach analyzing a roleplay simulation.

Deal Context:
- Company: ${simulation.deals.account_name}
- Deal Value: ${simulation.deals.deal_value} ${simulation.deals.currency}
- Stage: ${simulation.deals.stage}
${simulation.meeting_goal ? `\nMeeting Goal: ${simulation.meeting_goal}` : ''}

Analyze the following sales conversation and provide a structured debrief in JSON format:

{
  "what_went_well": ["point 1", "point 2", ...],
  "what_didnt": ["point 1", "point 2", ...],
  "likely_outcomes": ["outcome 1", "outcome 2", ...],
  "next_steps": ["step 1", "step 2", ...]
}

Be specific, actionable, and realistic. Focus on:
- Communication style and rapport building
- Objection handling and responses
- Value proposition clarity
- Question quality and active listening
- Alignment with stakeholder concerns
- Next action clarity

Conversation:
${conversationText}`;

    // Call Lovable AI
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
    const debriefContent = aiData.choices?.[0]?.message?.content;

    if (!debriefContent) {
      throw new Error('No debrief generated');
    }

    const debrief = JSON.parse(debriefContent);

    // Save debrief to database
    const { error: updateError } = await supabase
      .from('simulations')
      .update({ 
        debrief,
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', simulationId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ debrief }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Generate debrief error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Debrief generation failed';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

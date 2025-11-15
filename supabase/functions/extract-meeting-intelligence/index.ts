import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Central extraction prompt
const EXTRACTION_PROMPT = `You are an AI assistant that extracts key information from enterprise sales meeting notes.

Analyze the provided meeting notes and extract the following information in a structured format:

1. **Stakeholders**: People mentioned in the meeting with their details
   - name: Full name
   - role: Job title/role
   - sentiment: "positive", "neutral", or "negative" based on their attitude
   - influence: "high", "medium", or "low" - their decision-making power
   - notes: Key information about them

2. **Quotes**: Direct quotes or paraphrased statements from stakeholders
   - speaker: Who said it
   - quote: The actual quote or paraphrase
   - context: Brief context about when/why this was said

3. **Objections**: Concerns or objections raised during the meeting
   - topic: What the objection is about
   - severity: "high", "medium", or "low"
   - stakeholder: Who raised it (if known)
   - description: Details about the objection

4. **Risks**: Potential risks or red flags identified
   - category: e.g., "budget", "timeline", "technical", "political"
   - severity: "high", "medium", or "low"
   - description: Description of the risk
   - mitigation: Potential mitigation strategy (if mentioned)

5. **Approval Clues**: Signs of buying signals or approval process information
   - type: e.g., "budget_approval", "timeline_confirmed", "champion_identified"
   - description: Details about the approval signal
   - stakeholder: Who provided this signal (if applicable)

Return ONLY a valid JSON object with these exact keys: stakeholders, quotes, objections, risks, approval_clues
Each key should be an array of objects following the structures described above.
If a category has no items, return an empty array for that key.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, rawNotes } = await req.json();

    if (!meetingId || !rawNotes) {
      return new Response(
        JSON.stringify({ error: 'Missing meetingId or rawNotes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting extraction for meeting:', meetingId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to processing
    await supabase
      .from('meetings')
      .update({ extraction_status: 'processing' })
      .eq('id', meetingId);

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
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: `Here are the meeting notes to analyze:\n\n${rawNotes}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Lovable AI credits exhausted. Please add credits.');
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('AI extraction failed');
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    const extractedContent = aiData.choices[0].message.content;
    
    // Parse the JSON response
    let extracted;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = extractedContent.match(/```json\n([\s\S]*?)\n```/) || 
                       extractedContent.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : extractedContent;
      extracted = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate structure
    const requiredKeys = ['stakeholders', 'quotes', 'objections', 'risks', 'approval_clues'];
    const missingKeys = requiredKeys.filter(key => !extracted.hasOwnProperty(key));
    
    if (missingKeys.length > 0) {
      console.error('Missing keys in AI response:', missingKeys);
      throw new Error(`AI response missing required keys: ${missingKeys.join(', ')}`);
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        stakeholders: extracted.stakeholders || [],
        quotes: extracted.quotes || [],
        objections: extracted.objections || [],
        risks: extracted.risks || [],
        approval_clues: extracted.approval_clues || [],
        extraction_status: 'completed',
        extraction_error: null
      })
      .eq('id', meetingId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log('Extraction completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        extracted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Extraction error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Extraction failed';

    // Try to update meeting with error status
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { meetingId } = await req.json().catch(() => ({}));
      if (meetingId) {
        await supabase
          .from('meetings')
          .update({ 
            extraction_status: 'failed',
            extraction_error: errorMessage
          })
          .eq('id', meetingId);
      }
    } catch (dbError) {
      console.error('Failed to update error status:', dbError);
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
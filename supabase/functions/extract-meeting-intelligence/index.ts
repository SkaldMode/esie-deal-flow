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
   - role_title: Job title/role
   - department: Department or business unit (if mentioned)
   - stance_guess: "positive", "neutral", or "negative" based on their attitude toward the deal
   - power_guess: "high", "medium", or "low" - their decision-making power
   - communication_style: Brief suggestion on how to communicate with them (e.g., "data-driven, prefers detailed analysis" or "results-focused, values brevity")

2. **Quotes**: Direct quotes or paraphrased statements from stakeholders
   - speaker_name: Who said it
   - quote_text: The actual quote or paraphrase
   - context: Brief context about when/why this was said

3. **Objections**: Concerns or objections raised during the meeting
   - objection_text: Description of the objection
   - source_name: Who raised it (if known)

4. **Risks**: Potential risks or red flags identified
   - risk_description: Description of the risk
   - severity: "high", "medium", or "low"

5. **Approval Clues**: Signs of buying signals or approval process information
   - clue_text: Details about the approval signal
   - source_name: Who provided this signal (if applicable)

6. **Relationships** (infer from context, role titles, and meeting dynamics):
   - from_name: Person who has the relationship
   - to_name: Person the relationship is with
   - relationship_type: "reports_to", "influences", or "collaborates_with"
   - confidence: Your confidence level (0.0 to 1.0) in this relationship inference
   - reason: Brief explanation of why you inferred this relationship

Return ONLY a valid JSON object with these exact keys: stakeholders, quotes, objections, risks, approval_clues, relationships
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
    const requiredKeys = ['stakeholders', 'quotes', 'objections', 'risks', 'approval_clues', 'relationships'];
    const missingKeys = requiredKeys.filter(key => !extracted.hasOwnProperty(key));
    
    if (missingKeys.length > 0) {
      console.error('Missing keys in AI response:', missingKeys);
      // Don't fail if only relationships are missing (backward compatibility)
      if (missingKeys.some(k => k !== 'relationships')) {
        throw new Error(`AI response missing required keys: ${missingKeys.join(', ')}`);
      }
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

    // Auto-create stakeholder profiles and link to meeting
    try {
      // Get meeting details to get deal_id and user_id
      const { data: meetingData, error: meetingFetchError } = await supabase
        .from('meetings')
        .select('deal_id, user_id')
        .eq('id', meetingId)
        .single();

      if (meetingFetchError) throw meetingFetchError;

      const { deal_id, user_id } = meetingData;

      // Process each extracted stakeholder
      for (const stakeholder of (extracted.stakeholders || [])) {
        if (!stakeholder.name || !stakeholder.role_title) continue;

        // Try to insert stakeholder profile (will be ignored if duplicate exists)
        const { data: stakeholderProfile, error: insertError } = await supabase
          .from('stakeholders')
          .insert({
            deal_id,
            user_id,
            name: stakeholder.name,
            role_title: stakeholder.role_title,
            department: stakeholder.department || null,
            stance: stakeholder.stance_guess || null,
            power: stakeholder.power_guess || null,
            communication_style: stakeholder.communication_style || null
          })
          .select()
          .maybeSingle();

        // If insert failed due to duplicate, fetch the existing stakeholder
        let stakeholderId;
        if (insertError && insertError.code === '23505') {
          // Unique constraint violation - stakeholder already exists
          const { data: existing } = await supabase
            .from('stakeholders')
            .select('id')
            .eq('deal_id', deal_id)
            .eq('name', stakeholder.name)
            .eq('role_title', stakeholder.role_title)
            .single();
          
          stakeholderId = existing?.id;
        } else if (stakeholderProfile) {
          stakeholderId = stakeholderProfile.id;
        }

        // Create stakeholder mention link (if stakeholder exists)
        if (stakeholderId) {
          await supabase
            .from('stakeholder_mentions')
            .insert({
              stakeholder_id: stakeholderId,
              meeting_id: meetingId
            })
            .select()
            .maybeSingle(); // Ignore if duplicate mention
        }
      }

      console.log('Stakeholder profiles created/updated successfully');

      // Process relationships
      if (extracted.relationships && extracted.relationships.length > 0) {
        console.log(`Processing ${extracted.relationships.length} relationships`);
        
        // First, create a map of stakeholder names to IDs for this deal
        const { data: allStakeholders } = await supabase
          .from('stakeholders')
          .select('id, name, role_title')
          .eq('deal_id', deal_id);

        const stakeholderMap = new Map();
        allStakeholders?.forEach(s => {
          const key = `${s.name.toLowerCase()}|${s.role_title.toLowerCase()}`;
          stakeholderMap.set(key, s.id);
        });

        // Process each relationship
        for (const rel of extracted.relationships) {
          if (!rel.from_name || !rel.to_name || !rel.relationship_type) continue;

          // Find stakeholder IDs
          const fromKey = `${rel.from_name.toLowerCase()}`;
          const toKey = `${rel.to_name.toLowerCase()}`;
          
          let fromId = null;
          let toId = null;

          // Search for matching stakeholders by name
          for (const [key, id] of stakeholderMap.entries()) {
            const [name] = key.split('|');
            if (name === fromKey) fromId = id;
            if (name === toKey) toId = id;
          }

          // Only create relationship if both stakeholders exist
          if (fromId && toId && fromId !== toId) {
            await supabase
              .from('stakeholder_relationships')
              .insert({
                deal_id,
                from_stakeholder_id: fromId,
                to_stakeholder_id: toId,
                relationship_type: rel.relationship_type,
                confidence: rel.confidence || 0.5
              })
              .select()
              .maybeSingle(); // Ignore if duplicate relationship
          }
        }

        console.log('Relationships processed successfully');
      }
    } catch (stakeholderError) {
      // Log but don't fail the entire extraction if stakeholder creation fails
      console.error('Error creating stakeholder profiles:', stakeholderError);
    }

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
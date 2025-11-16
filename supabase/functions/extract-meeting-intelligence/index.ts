import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitResponse, addRateLimitHeaders } from "../_shared/rateLimit.ts";
import { getCorsHeaders, handleCorsPreflightResponse } from "../_shared/cors.ts";

const corsHeaders = getCorsHeaders();

// Simplified extraction prompt - only names and risks
const EXTRACTION_PROMPT = `You are an AI assistant that extracts key information from enterprise sales meeting notes.

Analyze the provided meeting notes and extract the following information in a structured format:

1. **Stakeholders**: People mentioned in the meeting
   - name: Full name of the person
   - role_title: Job title or role (e.g., "VP Engineering", "CTO", "Product Manager")

2. **Risks**: Potential risks or red flags identified
   - risk_description: Clear description of the risk or concern
   - severity: "high", "medium", or "low"

IMPORTANT: Focus on extracting ONLY stakeholder names with their job titles and any risks mentioned.
Do not extract quotes, objections, or other details.

Return ONLY a valid JSON object with these exact keys: stakeholders, risks
Each key should be an array of objects following the structures described above.
If a category has no items, return an empty array for that key.

Example format:
{
  "stakeholders": [
    {"name": "Sarah Chen", "role_title": "VP Engineering"},
    {"name": "John Smith", "role_title": "CTO"}
  ],
  "risks": [
    {"risk_description": "Timeline is very aggressive", "severity": "high"},
    {"risk_description": "Budget approval pending", "severity": "medium"}
  ]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightResponse();
  }

  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth(req);
    if (authError) {
      console.error('Auth error:', authError);
      return unauthorizedResponse(authError, corsHeaders);
    }

    const { meetingId, rawNotes } = await req.json();

    if (!meetingId || !rawNotes) {
      return new Response(
        JSON.stringify({ error: 'Missing meetingId or rawNotes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    if (typeof rawNotes !== 'string' || rawNotes.length > 50000) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          message: 'Meeting notes must be a string with maximum 50,000 characters'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting extraction for meeting:', meetingId, 'User:', userId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check rate limit
    const rateLimitResult = await checkRateLimit(supabase, userId, 'extract-meeting-intelligence');
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

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

    // Validate structure - simplified to only stakeholders and risks
    const requiredKeys = ['stakeholders', 'risks'];
    const missingKeys = requiredKeys.filter(key => !extracted.hasOwnProperty(key));

    if (missingKeys.length > 0) {
      console.error('Missing keys in AI response:', missingKeys);
      throw new Error(`AI response missing required keys: ${missingKeys.join(', ')}`);
    }

    // Save to database - only stakeholders and risks
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        stakeholders: extracted.stakeholders || [],
        risks: extracted.risks || [],
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

      // Process each extracted stakeholder - simplified to only name and role
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
            // Removed: department, stance, power, communication_style
            // These can be filled manually by users later
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

      // Note: Relationship processing and learning loop removed for MVP simplification
      // These features are deferred to post-MVP
    } catch (stakeholderError) {
      // Log but don't fail the entire extraction if stakeholder creation fails
      console.error('Error creating stakeholder profiles:', stakeholderError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted
      }),
      {
        headers: addRateLimitHeaders(
          { ...corsHeaders, 'Content-Type': 'application/json' },
          rateLimitResult
        )
      }
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
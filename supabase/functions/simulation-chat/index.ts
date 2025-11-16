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
    const { simulationId, message, stakeholderProfiles, dealContext, meetingGoal } = await req.json();

    console.log('Simulation chat request:', { simulationId, messageLength: message?.length });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing transcript
    const { data: simulation, error: simError } = await supabase
      .from('simulations')
      .select('transcript')
      .eq('id', simulationId)
      .single();

    if (simError) throw simError;

    const existingTranscript = simulation?.transcript || [];

    // Build system prompt with stakeholder context
    const stakeholderContext = stakeholderProfiles.map((s: any) => 
      `${s.name} (${s.role_title}${s.department ? ', ' + s.department : ''}):\n` +
      `- Stance: ${s.stance || 'neutral'}\n` +
      `- Power: ${s.power || 'medium'}\n` +
      `- Communication Style: ${s.communication_style || 'professional'}\n`
    ).join('\n');

    const systemPrompt = `You are roleplaying as the following stakeholder(s) in a sales meeting simulation:

${stakeholderContext}

Deal Context:
- Company: ${dealContext.account_name}
- Deal Value: ${dealContext.deal_value} ${dealContext.currency}
- Stage: ${dealContext.stage}
${meetingGoal ? `\nUser's Meeting Goal: ${meetingGoal}` : ''}

CRITICAL GUARDRAILS:
1. Stay STRICTLY within the provided deal context - do not invent information
2. Roleplay authentically based on each stakeholder's stance, power, and communication style
3. If multiple stakeholders, have them interact naturally (agreeing, disagreeing, building on each other's points)
4. Respond realistically to the user's pitch with appropriate objections, questions, or support based on stance
5. Use professional business language appropriate for enterprise sales
6. If you don't have information, say "I'd need to check on that" rather than inventing facts
7. Keep responses concise and realistic (2-4 sentences typically)

When responding:
- If positive stance: Be receptive but professional, ask good questions
- If neutral stance: Be analytical, need convincing with data/proof
- If negative stance: Express concerns professionally, need strong reassurance

Format: If simulating multiple stakeholders, prefix each response with "[Name]:". If single stakeholder, respond naturally.`;

    // Prepare conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...existingTranscript.map((t: any) => ({
        role: t.role,
        content: t.content
      })),
      { role: 'user', content: message }
    ];

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
        messages: messages,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Lovable AI credits exhausted. Please add credits.');
      }
      throw new Error('AI request failed');
    }

    // Stream the response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || line.startsWith(':')) continue;
              if (!line.startsWith('data: ')) continue;

              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }

          // Save to database
          const updatedTranscript = [
            ...existingTranscript,
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() }
          ];

          await supabase
            .from('simulations')
            .update({ transcript: updatedTranscript })
            .eq('id', simulationId);

          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Simulation chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Simulation failed';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

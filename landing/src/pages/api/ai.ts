import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

export const prerender = false;

const SYSTEM_PROMPT = `You are a design token expert. Given a text prompt describing a desired visual style, generate a coherent set of CSS color values in OKLCH format for a design system.

Rules:
- Output ONLY valid JSON — no markdown, no explanation, no code fences
- Every value must be in oklch(L C H) format where L is 0-1, C is 0-0.4, H is 0-360
- Ensure sufficient contrast between foreground/background pairs (min 4.5:1 ratio)
- Background colors should have low chroma (C < 0.03)
- Foreground colors should contrast well with their paired background
- Primary should be the dominant brand color matching the prompt
- Destructive should always be a red tone (H around 25-30)
- Charts should be 5 distinct, visually separated colors
- Keep the palette cohesive — colors should feel like they belong together

Output format — a flat JSON object with variable names as keys:
{
  "--background": "oklch(...)",
  "--foreground": "oklch(...)",
  "--primary": "oklch(...)",
  "--primary-foreground": "oklch(...)",
  ...
}

Only include variables that are provided in the user's variable list.`;

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );
  }

  // CORS preflight is handled by OPTIONS below, but add headers to POST too
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const { prompt, variables } = await request.json() as {
      prompt: string;
      variables: string[];
    };

    if (!prompt || !variables?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt or variables' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
      );
    }

    const client = new Anthropic({ apiKey });

    const userMessage = `Prompt: "${prompt}"

Variables to generate values for:
${variables.join('\n')}

Generate the JSON object with OKLCH values for each variable.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userMessage }],
      system: SYSTEM_PROMPT,
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return new Response(
        JSON.stringify({ error: 'No text response from model' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
      );
    }

    // Parse the JSON from Haiku's response
    const raw = textBlock.text.trim();
    // Strip potential markdown fences just in case
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const palette = JSON.parse(jsonStr);

    return new Response(
      JSON.stringify({ palette }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );
  }
};

// Handle CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders() });
};

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

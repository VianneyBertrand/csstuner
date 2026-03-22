import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

export const prerender = false;

const SYSTEM_PROMPT = `You are an expert color designer. Generate CSS color values in OKLCH format.

FORMAT:
- Output ONLY valid JSON — no markdown, no explanation, no code fences
- Every value: oklch(L C H) where L is 0-1, C is 0-0.4, H is 0-360

SCOPE:
- ONLY change variables DIRECTLY related to what the user asks
- "primary in orange" → only --primary and --primary-foreground
- "make it blue and serious" → change all variables for a cohesive theme
- Be MINIMAL. Never add variables the user didn't ask for unless they request a full theme

COLOR THEORY — apply these rules for professional results:

1. HARMONY SYSTEMS (pick one based on the prompt mood):
   - Analogous (±30° hue): calm, cohesive, professional. Best for corporate/fintech.
   - Complementary (180° hue): high energy, contrast. Best for creative/bold brands.
   - Split-complementary (±150° hue): vibrant but balanced. Best for modern SaaS.
   - Triadic (120° apart): playful, diverse. Best for consumer/social apps.

2. LIGHTNESS SCALE (critical for readability):
   - Backgrounds/surfaces: L > 0.95 (light mode) or L < 0.15 (dark mode)
   - Muted backgrounds: L between 0.93-0.97
   - Primary/accent colors: L between 0.45-0.70 for best vibrancy
   - Foreground text on light bg: L < 0.25
   - Foreground text on dark bg: L > 0.90
   - NEVER put text with L > 0.7 on background with L > 0.9 (invisible)

3. CHROMA GUIDELINES:
   - Backgrounds: C < 0.01 (near neutral)
   - Muted elements: C between 0.005-0.02
   - Primary/accent: C between 0.15-0.30 for rich, saturated color
   - Destructive (red): H 25-30, C 0.20-0.25, L 0.55-0.60
   - Keep related colors (primary, accent) at similar chroma levels

4. FOREGROUND PAIRING:
   - Every --xxx-foreground must contrast with --xxx at ratio ≥ 4.5:1
   - On dark colors (L < 0.5): foreground should be L > 0.90, C < 0.01
   - On light colors (L > 0.5): foreground should be L < 0.20, C < 0.01
   - On medium colors: choose white (L=0.98) or black (L=0.15) based on which gives more contrast

5. MOOD MAPPING:
   - "serious/professional/corporate" → low chroma (C < 0.15), blue-gray hues (H 250-280)
   - "playful/fun/creative" → high chroma (C > 0.20), warm hues (H 30-60, 300-340)
   - "elegant/luxury" → very low chroma (C < 0.08), gold accents (H 85-95)
   - "energetic/bold" → high chroma (C > 0.25), complementary pairs
   - "calm/zen/minimal" → low chroma (C < 0.10), green-blue hues (H 150-200)
   - "warm/friendly" → medium chroma, orange-red hues (H 30-60)
   - "cold/tech" → medium chroma, cyan-blue hues (H 220-260)

Output: flat JSON with ONLY the variables that need to change.`;

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );
  }

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

Variables available:
${variables.join('\n')}

Generate the JSON object with OKLCH values. Only include variables that should change.`;

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

    const raw = textBlock.text.trim();
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const palette = JSON.parse(jsonStr) as Record<string, string>;

    // Post-processing: validate and fix contrast issues
    const fixed = postProcessPalette(palette);

    return new Response(
      JSON.stringify({ palette: fixed }),
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

// ============ POST-PROCESSING ============

interface OklchColor {
  l: number;
  c: number;
  h: number;
}

function parseOklch(value: string): OklchColor | null {
  const match = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!match) return null;
  return {
    l: parseFloat(match[1]),
    c: parseFloat(match[2]),
    h: parseFloat(match[3]),
  };
}

function formatOklch(color: OklchColor): string {
  return `oklch(${round(color.l, 3)} ${round(color.c, 3)} ${round(color.h, 2)})`;
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

/**
 * Approximate relative luminance from OKLCH lightness.
 * Not perfectly accurate but good enough for contrast checks.
 */
function relativeLuminance(l: number): number {
  // OKLCH L is perceptual lightness 0-1, approximate sRGB luminance
  return Math.pow(l, 2.2);
}

function contrastRatio(l1: number, l2: number): number {
  const lum1 = relativeLuminance(l1);
  const lum2 = relativeLuminance(l2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Find foreground/background pairs and fix contrast.
 * Also clamp values to valid ranges.
 */
function postProcessPalette(palette: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};

  // First pass: parse all colors and clamp to valid ranges
  const parsed: Record<string, OklchColor> = {};
  for (const [name, value] of Object.entries(palette)) {
    const color = parseOklch(value);
    if (!color) {
      result[name] = value; // pass through unparseable values
      continue;
    }
    // Clamp to valid ranges
    color.l = Math.max(0, Math.min(1, color.l));
    color.c = Math.max(0, Math.min(0.4, color.c));
    color.h = ((color.h % 360) + 360) % 360;
    parsed[name] = color;
  }

  // Second pass: fix foreground/background contrast
  for (const [name, color] of Object.entries(parsed)) {
    // Find pairs: --xxx-foreground should contrast with --xxx
    if (name.endsWith('-foreground')) {
      const bgName = name.replace('-foreground', '');
      const bgColor = parsed[bgName];

      if (bgColor) {
        const ratio = contrastRatio(color.l, bgColor.l);
        if (ratio < 4.5) {
          // Fix: if bg is dark, make fg very light; if bg is light, make fg very dark
          if (bgColor.l < 0.5) {
            color.l = Math.max(color.l, 0.93);
            color.c = Math.min(color.c, 0.01);
          } else {
            color.l = Math.min(color.l, 0.18);
            color.c = Math.min(color.c, 0.01);
          }
        }
      }
    }

    // Background/surface colors should have near-zero chroma
    if (name.includes('background') || name === '--card' || name === '--popover' || name === '--muted') {
      color.c = Math.min(color.c, 0.015);
    }
  }

  // Write back
  for (const [name, color] of Object.entries(parsed)) {
    result[name] = formatOklch(color);
  }

  return result;
}

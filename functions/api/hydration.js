import Anthropic from '@anthropic-ai/sdk';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

// POST /api/hydration  { text: "1 cup of non-fat milk" }  ->  { oz: 7.2 }
// Cloudflare Pages Function: estimates the water content of a food/drink
// description with Claude Haiku. Only reached when the client's local table
// can't recognize the item. The API key stays server-side in env.
export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'not_configured' }, 503);

  let text;
  try {
    ({ text } = await request.json());
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!text || typeof text !== 'string' || text.length > 200) {
    return json({ error: 'bad_request' }, 400);
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 64,
      system:
        'You estimate hydration from a food or drink description. Given the item and quantity, estimate how many US fluid ounces of WATER the person actually consumed, accounting for the item\'s typical water content (e.g. milk ~90%, smoothie ~80%, coffee ~98%, juice ~88%, broth ~92%, watermelon ~92%). If no quantity is given, assume one typical serving. If the item has no meaningful water content (e.g. a spoonful of sugar), answer 0. Respond with ONLY the number of fluid ounces — digits with an optional decimal point, no words, no units.',
      messages: [{ role: 'user', content: text }],
    });
    const out = message.content.find((b) => b.type === 'text')?.text ?? '';
    const match = out.match(/\d+(\.\d+)?/);
    const oz = match ? parseFloat(match[0]) : 0;
    return json({ oz: oz > 0 ? Math.round(oz * 10) / 10 : 0 });
  } catch {
    return json({ error: 'estimate_failed' }, 502);
  }
}

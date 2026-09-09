import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin';
import { handleError, jsonError, noStore, readJson } from '@/lib/http';
import { hitLimit, LIMITS } from '@/lib/limits';
import { readConfig } from '@/lib/registry';
import { CUSTOM_TOPIC_PROMPT, parseCustomTopic } from '@/lib/validateTopic';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Optional AI topic generator.
//
// The API key lives on the server, so it must never be a free-for-all: it is
// off unless a key is configured, then admin-only, and only available to
// everyone if the admin flips the switch. On top of that every client gets a
// small daily budget - a leaked endpoint can cost a few requests, not a bill.
//
// Any OpenAI-compatible endpoint works (Groq, OpenRouter, Google's compat
// endpoint, a local server), configured via:
//   LLM_API_KEY, LLM_BASE_URL (default Groq), LLM_MODEL

const DEFAULT_BASE = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export async function GET(req: Request) {
  const config = await readConfig();
  return noStore(
    NextResponse.json({
      available: Boolean(process.env.LLM_API_KEY) && (config.llmForEveryone || isAdminRequest(req)),
      configured: Boolean(process.env.LLM_API_KEY),
    }),
  );
}

export async function POST(req: Request) {
  try {
    const key = process.env.LLM_API_KEY;
    if (!key) return jsonError('Für dieses Deployment ist keine KI eingerichtet.', 400);

    const config = await readConfig();
    if (!config.llmForEveryone && !isAdminRequest(req)) {
      return jsonError('Der KI-Generator ist hier nicht freigegeben.', 403);
    }
    if (hitLimit(req, LIMITS.llm)) {
      return jsonError('Tageslimit für KI-Themen erreicht.', 429);
    }

    const body = await readJson(req);
    const theme = String(body.theme ?? '').trim().slice(0, 60);
    if (theme.length < 2) return jsonError('Bitte ein Thema angeben.', 400);

    const prompt = CUSTOM_TOPIC_PROMPT.replace(
      '<<< HIER DEIN THEMA EINSETZEN, z.B. "Star Wars" oder "Herr der Ringe" >>>',
      theme,
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    let text = '';
    try {
      const res = await fetch(`${process.env.LLM_BASE_URL || DEFAULT_BASE}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || DEFAULT_MODEL,
          temperature: 0.8,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return jsonError(`Die KI antwortet nicht (${data?.error?.message ?? res.status}).`, 502);
      }
      text = String(data?.choices?.[0]?.message?.content ?? '');
    } finally {
      clearTimeout(timer);
    }

    // Strip a code fence if the model insisted on one, then run the answer
    // through exactly the same strict validation as a pasted topic. An LLM is
    // just another untrusted source.
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const topic = parseCustomTopic(cleaned);
    return noStore(
      NextResponse.json({ json: JSON.stringify({ name: topic.name, pairs: topic.pairs }) }),
    );
  } catch (e) {
    return handleError(e);
  }
}

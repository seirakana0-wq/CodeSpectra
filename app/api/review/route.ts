import { NextRequest } from 'next/server';
import { parseGithubUrl, fetchCode } from '@/lib/github';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompt';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LLM_BASE = process.env.LLM_BASE_URL || 'https://token-plan-sgp.xiaomimimo.com/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'mimo-v2.5-pro';
const LLM_KEY = process.env.LLM_API_KEY;

function sse(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  if (!LLM_KEY) {
    return new Response('LLM_API_KEY not configured', { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const url = (body.url || '').toString().trim();

  const parsed = parseGithubUrl(url);
  if (!parsed) {
    return new Response('Invalid GitHub URL. Expected github.com/owner/repo, /pull/N, /blob/..., or /tree/...', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) =>
        controller.enqueue(encoder.encode(sse(event, data)));

      try {
        send('status', { stage: 'fetching', kind: parsed.kind, target: `${parsed.owner}/${parsed.repo}` });
        const code = await fetchCode(parsed);
        send('meta', {
          title: code.title,
          url: code.url,
          kind: code.kind,
          files: code.files.length,
          totalBytes: code.totalBytes,
          truncated: code.truncated,
        });

        if (code.files.length === 0) {
          send('error', { message: 'No reviewable text files found at that URL.' });
          controller.close();
          return;
        }

        send('status', { stage: 'reviewing' });

        const userPrompt = buildUserPrompt(code);

        const llmRes = await fetch(`${LLM_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LLM_KEY}`,
          },
          body: JSON.stringify({
            model: LLM_MODEL,
            stream: true,
            temperature: 0.2,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
          }),
        });

        if (!llmRes.ok || !llmRes.body) {
          const errText = await llmRes.text().catch(() => '');
          send('error', { message: `LLM ${llmRes.status}: ${errText.slice(0, 300)}` });
          controller.close();
          return;
        }

        const reader = llmRes.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') {
              send('done', {});
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (typeof delta === 'string' && delta.length > 0) {
                send('chunk', { text: delta });
              }
            } catch {
              // partial json — accumulate
            }
          }
        }

        send('done', {});
        controller.close();
      } catch (err: any) {
        send('error', { message: err?.message ?? 'unknown error' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

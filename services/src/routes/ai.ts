import { Router, Request, Response } from 'express';
import db from '../db/client';
import { createSignedObjectUrl, isS3UploadEnabled, uploadBufferToS3 } from '../services/s3';

const router = Router();
const DIFY_ENDPOINT_PATH = '/chat-messages';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  return value;
}

function formatJst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 16);
}

function parseScreenshotDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; extension: string } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Invalid screenshot data URL');
  const mimeType = match[1];
  const extension = EXT_BY_MIME[mimeType];
  if (!extension) throw new Error(`Unsupported screenshot mime type: ${mimeType}`);
  return { buffer: Buffer.from(match[2], 'base64'), mimeType, extension };
}

function extractDifyAnswer(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.answer === 'string' && candidate.answer.trim()) {
    return candidate.answer.trim();
  }
  const data = candidate.data;
  if (data && typeof data === 'object') {
    const outputs = (data as Record<string, unknown>).outputs;
    if (outputs && typeof outputs === 'object') {
      const values = Object.values(outputs as Record<string, unknown>);
      const textValue = values.find((value) => typeof value === 'string' && value.trim());
      if (typeof textValue === 'string') return textValue.trim();
    }
  }
  return null;
}

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

function sanitizeChatMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((m) => {
      if (!m || typeof m !== 'object') return null;
      const role = (m as Record<string, unknown>).role;
      const content = (m as Record<string, unknown>).content;
      if ((role === 'user' || role === 'assistant' || role === 'system') && typeof content === 'string') {
        const trimmed = content.trim();
        if (trimmed.length === 0) return null;
        return { role, content: trimmed } as ChatMessage;
      }
      return null;
    })
    .filter((m): m is ChatMessage => Boolean(m));
}

router.post('/blog-draft', (req: Request, res: Response) => {
  const body = req.body as {
    from?: unknown;
    to?: unknown;
    tag?: unknown;
    mode?: unknown;
    title?: unknown;
  };
  const from = normalizeDate(body.from);
  const to = normalizeDate(body.to);
  if (!from || !to || from > to) {
    res.status(400).json({ error: 'from/to must be valid dates and from <= to' });
    return;
  }

  const tag = typeof body.tag === 'string' ? body.tag.trim().replace(/^#/, '').toLowerCase() : '';
  const mode = typeof body.mode === 'string' ? body.mode.trim().toLowerCase() : '';
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : '技術ログ振り返り';

  const whereClauses = [
    "date(datetime(m.created_at, '+9 hours')) BETWEEN ? AND ?",
  ];
  const params: (string | number)[] = [from, to];

  if (mode) {
    whereClauses.push('m.mode = ?');
    params.push(mode);
  }
  if (tag) {
    whereClauses.push(`
      EXISTS (
        SELECT 1
        FROM memo_tags mt
        INNER JOIN tags t ON t.id = mt.tag_id
        WHERE mt.memo_id = m.id AND t.name = ?
      )
    `);
    params.push(tag);
  }

  const memos = db.prepare(`
    SELECT m.id, m.content, m.status, m.created_at, m.mode, m.stuck_minutes
    FROM memos m
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY m.created_at ASC
    LIMIT 200
  `).all(...params) as Array<{
    id: number;
    content: string;
    status: string | null;
    created_at: string;
    mode: string;
    stuck_minutes: number;
  }>;

  if (memos.length === 0) {
    res.status(200).json({
      title,
      range: { from, to },
      draft: `# ${title}\n\n対象期間のログがないため下書きを生成できませんでした。`,
      sections: [],
      generator: 'template',
      note: '現在はLLM未接続のため、テンプレートベースで下書きを生成しています。',
    });
    return;
  }

  const intro = `対象期間（${from} 〜 ${to}）で${memos.length}件のログを振り返りました。`;
  const stuckItems = memos.filter((memo) => memo.status === '詰まり');
  const solvedItems = memos.filter((memo) => memo.status !== '詰まり');

  const topProblems = stuckItems.slice(0, 5).map((memo) => `- ${memo.content}`);
  const solutions = solvedItems.slice(-5).map((memo) => `- ${memo.content}`);
  const timeline = memos.slice(0, 10).map((memo) => `- ${formatJst(memo.created_at)}: ${memo.content}`);

  const sections = [
    { title: '導入', body: intro },
    {
      title: '課題',
      body: topProblems.length > 0
        ? `特に詰まりが多かった論点:\n${topProblems.join('\n')}`
        : '期間内で大きな詰まりは発生しませんでした。',
    },
    {
      title: '解決策',
      body: solutions.length > 0
        ? `解決に向けて実施したこと:\n${solutions.join('\n')}`
        : '解決策として整理できるログが不足しています。',
    },
    {
      title: 'まとめ',
      body: `次回に向けて、以下の論点を継続監視します。\n${timeline.join('\n')}`,
    },
  ];

  const draft = [
    `# ${title}`,
    '',
    `## 導入`,
    sections[0].body,
    '',
    `## 課題`,
    sections[1].body,
    '',
    `## 解決策`,
    sections[2].body,
    '',
    `## まとめ`,
    sections[3].body,
  ].join('\n');

  res.status(200).json({
    title,
    range: { from, to },
    count: memos.length,
    draft,
    sections,
    generator: 'template',
    note: '現在はLLM未接続のため、テンプレートベースで下書きを生成しています。',
  });
});

router.post('/ask-with-screenshot', async (req: Request, res: Response) => {
  const body = req.body as {
    message?: unknown;
    screenshotDataUrl?: unknown;
    user?: unknown;
  };

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const screenshotDataUrl = typeof body.screenshotDataUrl === 'string' ? body.screenshotDataUrl.trim() : '';
  const user = typeof body.user === 'string' && body.user.trim() ? body.user.trim() : 'thought-drop-user';

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const difyBaseUrl = (process.env.DIFY_API_BASE_URL ?? '').trim().replace(/\/$/, '');
  const difyApiKey = (process.env.DIFY_API_KEY ?? '').trim();
  const openaiApiKey = (process.env.OPENAI_API_KEY ?? '').trim();

  let signedImageUrl: string | undefined;
  if (screenshotDataUrl) {
    if (!isS3UploadEnabled()) {
      res.status(503).json({ error: 'S3_BUCKET is required when screenshotDataUrl is provided' });
      return;
    }
    try {
      const parsed = parseScreenshotDataUrl(screenshotDataUrl);
      const uploaded = await uploadBufferToS3({
        buffer: parsed.buffer,
        mimeType: parsed.mimeType,
        extension: parsed.extension,
        createdAtIso: new Date().toISOString(),
      });
      signedImageUrl = await createSignedObjectUrl({
        bucket: uploaded.bucket,
        key: uploaded.key,
        expiresInSec: 300,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: `failed to process screenshot: ${detail}` });
      return;
    }
  }

  // Prefer Dify if configured, otherwise fallback to OpenAI vision
  if (difyBaseUrl && difyApiKey) {
    const endpoint = `${difyBaseUrl}${DIFY_ENDPOINT_PATH}`;
    const payload: Record<string, unknown> = {
      query: message,
      response_mode: 'blocking',
      user,
      inputs: {},
    };
    if (signedImageUrl) {
      payload.files = [{
        type: 'image',
        transfer_method: 'remote_url',
        url: signedImageUrl,
      }];
    }

    try {
      const difyResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${difyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const raw = await difyResponse.text();
      let parsed: unknown = {};
      try {
        parsed = raw ? JSON.parse(raw) as unknown : {};
      } catch {
        parsed = { raw };
      }
      if (!difyResponse.ok) {
        res.status(502).json({
          error: 'Dify API failed',
          status: difyResponse.status,
          detail: parsed,
        });
        return;
      }

      const answer = extractDifyAnswer(parsed) ?? '回答を取得できませんでした。';
      res.status(200).json({
        answer,
        mode: signedImageUrl ? 'ask-with-screenshot' : 'ask-only',
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      res.status(502).json({ error: `failed to call Dify API: ${detail}` });
    }
    return;
  }

  // OpenAI fallback
  if (!openaiApiKey) {
    res.status(503).json({ error: 'Neither Dify nor OpenAI is configured. Set OPENAI_API_KEY or DIFY_ vars.' });
    return;
  }

  try {
    const model = (process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL);
    const contentParts: any[] = [{ type: 'text', text: message }];
    if (signedImageUrl) {
      contentParts.push({ type: 'image_url', image_url: { url: signedImageUrl, detail: 'high' } });
    }
    const payload = {
      model,
      messages: [
        { role: 'system', content: 'You are a concise assistant. If an image is provided, reference it directly.' },
        { role: 'user', content: contentParts },
      ],
      temperature: 0.2,
    };

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const raw = await openaiResp.text();
    let parsed: any = {};
    try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = { raw }; }
    if (!openaiResp.ok) {
      res.status(502).json({ error: 'OpenAI API failed', status: openaiResp.status, detail: parsed });
      return;
    }

    const answer = typeof parsed.choices?.[0]?.message?.content === 'string'
      ? parsed.choices[0].message.content
      : '回答を取得できませんでした。';
    res.status(200).json({
      answer,
      mode: signedImageUrl ? 'ask-with-screenshot' : 'ask-only',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    res.status(502).json({ error: `failed to call OpenAI API: ${detail}` });
  }
});

// v0: Simple chat via OpenAI (non-streaming)
router.post('/chat', async (req: Request, res: Response) => {
  const body = req.body as { messages?: unknown; model?: unknown; temperature?: unknown };
  const messages = sanitizeChatMessages(body.messages);
  const model = (typeof body.model === 'string' && body.model.trim())
    ? body.model.trim()
    : (process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL);
  const temperature = typeof body.temperature === 'number' ? Math.min(Math.max(body.temperature, 0), 1) : 0.3;

  if (messages.length === 0) {
    res.status(400).json({ error: 'messages must be a non-empty array' });
    return;
  }

  const apiKey = (process.env.OPENAI_API_KEY ?? '').trim();
  if (!apiKey) {
    res.status(503).json({ error: 'OPENAI_API_KEY is required' });
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    const raw = await response.text();
    let parsed: any = {};
    try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = { raw }; }
    if (!response.ok) {
      res.status(502).json({ error: 'OpenAI API failed', status: response.status, detail: parsed });
      return;
    }

    const choice = parsed.choices?.[0]?.message?.content;
    const reply: string = typeof choice === 'string' ? choice : '回答を取得できませんでした。';
    const usage = parsed.usage ?? null;
    res.status(200).json({ reply, model, usage });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    res.status(502).json({ error: `failed to call OpenAI API: ${detail}` });
  }
});

// v1: Streaming chat via OpenAI (SSE)
router.post('/chat/stream', async (req: Request, res: Response) => {
  const body = req.body as { messages?: unknown; model?: unknown; temperature?: unknown };
  const messages = sanitizeChatMessages(body.messages);
  const model = (typeof body.model === 'string' && body.model.trim())
    ? body.model.trim()
    : (process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL);
  const temperature = typeof body.temperature === 'number' ? Math.min(Math.max(body.temperature, 0), 1) : 0.3;

  if (messages.length === 0) {
    res.status(400).json({ error: 'messages must be a non-empty array' });
    return;
  }

  const apiKey = (process.env.OPENAI_API_KEY ?? '').trim();
  if (!apiKey) {
    res.status(503).json({ error: 'OPENAI_API_KEY is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // flush headers
  res.flushHeaders?.();

  let ended = false;
  const endStream = (code?: number, detail?: unknown) => {
    if (ended) return;
    if (detail) {
      try { res.write(`event: error\n`); res.write(`data: ${JSON.stringify(detail)}\n\n`); } catch {}
    }
    try { res.write(`event: done\n`); res.write(`data: [DONE]\n\n`); } catch {}
    res.end();
    ended = true;
  };

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, temperature, stream: true }),
    });

    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text();
      endStream(502, { error: 'OpenAI API failed', status: upstream.status, detail: raw });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    const reader = (upstream.body as any).getReader?.();
    if (!reader) {
      // Fallback for environments without getReader
      endStream(500, { error: 'ReadableStream reader not available' });
      return;
    }

    const pump = async (): Promise<void> => {
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const lines = chunk.split('\n').map((l) => l.trim());
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (data === '[DONE]') {
                endStream();
                return;
              }
              try {
                const json = JSON.parse(data) as any;
                const delta: string | undefined = json.choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta.length > 0) {
                  res.write(`data: ${JSON.stringify({ delta })}\n\n`);
                }
              } catch {
                // ignore parse errors for spurious lines
              }
            }
          }
        }
        endStream();
      } catch (err) {
        endStream(500, { error: 'stream error', detail: err instanceof Error ? err.message : String(err) });
      }
    };

    void pump();
  } catch (error) {
    endStream(502, { error: 'failed to call OpenAI API', detail: error instanceof Error ? error.message : String(error) });
  }
});

export default router;

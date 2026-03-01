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
    useOcr?: unknown;
  };

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const screenshotDataUrl = typeof body.screenshotDataUrl === 'string' ? body.screenshotDataUrl.trim() : '';
  const user = typeof body.user === 'string' && body.user.trim() ? body.user.trim() : 'thought-drop-user';
  const useOcr = Boolean(body.useOcr);

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const difyBaseUrl = (process.env.DIFY_API_BASE_URL ?? '').trim().replace(/\/$/, '');
  const difyApiKey = (process.env.DIFY_API_KEY ?? '').trim();
  const openaiApiKey = (process.env.OPENAI_API_KEY ?? '').trim();

  let signedImageUrl: string | undefined;
  let uploadedInfo: { bucket: string; key: string; mime: string } | undefined;
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
      uploadedInfo = { bucket: uploaded.bucket, key: uploaded.key, mime: parsed.mimeType };
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

  // Optionally run OCR (v0: via LLM vision), then answer
  if (!openaiApiKey) {
    res.status(503).json({ error: 'Neither Dify nor OpenAI is configured. Set OPENAI_API_KEY or DIFY_ vars.' });
    return;
  }

  try {
    const model = (process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL);

    // v0 OCR: Use LLM to transcribe text when useOcr is true and image exists
    let ocrText: string | undefined;
    if (useOcr && signedImageUrl) {
      const ocrPayload = {
        model,
        messages: [
          { role: 'system', content: 'You transcribe on-screen text from an image. Output only plain text; no commentary.' },
          { role: 'user', content: [
            { type: 'text', text: 'Transcribe all visible text in the image. Keep line breaks.' },
            { type: 'image_url', image_url: { url: signedImageUrl, detail: 'high' } },
          ] },
        ],
        temperature: 0,
      } as any;
      const ocrResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(ocrPayload),
      });
      const ocrRaw = await ocrResp.text();
      try {
        const ocrParsed = ocrRaw ? JSON.parse(ocrRaw) : {};
        const text = ocrParsed.choices?.[0]?.message?.content;
        if (typeof text === 'string' && text.trim()) {
          ocrText = text.trim();
        }
      } catch {/* ignore OCR parse errors */}
    }

    // Build final answer prompt with OCR text included when available
    const userParts: any[] = [{ type: 'text', text: message }];
    if (ocrText) {
      userParts.push({ type: 'text', text: `\n[OCR Extracted Text]\n${ocrText.slice(0, 6000)}` });
    }
    if (signedImageUrl) {
      userParts.push({ type: 'image_url', image_url: { url: signedImageUrl, detail: 'high' } });
    }
    const answerPayload = {
      model,
      messages: [
        { role: 'system', content: 'You are a concise assistant. Use both the image and OCR text if provided. Provide concrete, actionable steps in Japanese.' },
        { role: 'user', content: userParts },
      ],
      temperature: 0.2,
    } as any;

    const answerResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(answerPayload),
    });
    const answerRaw = await answerResp.text();
    let answerParsed: any = {};
    try { answerParsed = answerRaw ? JSON.parse(answerRaw) : {}; } catch { answerParsed = { raw: answerRaw }; }
    if (!answerResp.ok) {
      res.status(502).json({ error: 'OpenAI API failed', status: answerResp.status, detail: answerParsed });
      return;
    }
    const answer = typeof answerParsed.choices?.[0]?.message?.content === 'string'
      ? answerParsed.choices[0].message.content
      : '回答を取得できませんでした。';

    // Persist ask
    try {
      db.prepare(`
        INSERT INTO ai_asks (user, message, s3_bucket, s3_key, mime_type, ocr_text, answer, answer_model, usage_prompt_tokens, usage_completion_tokens)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user,
        message,
        uploadedInfo?.bucket ?? null,
        uploadedInfo?.key ?? null,
        uploadedInfo?.mime ?? null,
        ocrText ?? null,
        answer,
        model,
        answerParsed.usage?.prompt_tokens ?? null,
        answerParsed.usage?.completion_tokens ?? null,
      );
    } catch {/* ignore persist errors */}

    res.status(200).json({
      answer,
      mode: signedImageUrl ? 'ask-with-screenshot' : 'ask-only',
      ocr: useOcr ? { included: Boolean(ocrText), length: ocrText?.length ?? 0 } : undefined,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    res.status(502).json({ error: `failed to call OpenAI API: ${detail}` });
  }
});

// Streaming version: Ask with Screenshot (SSE)
router.post('/ask-with-screenshot/stream', async (req: Request, res: Response) => {
  const body = req.body as {
    message?: unknown;
    screenshotDataUrl?: unknown;
    user?: unknown;
    useOcr?: unknown;
  };

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const screenshotDataUrl = typeof body.screenshotDataUrl === 'string' ? body.screenshotDataUrl.trim() : '';
  const user = typeof body.user === 'string' && body.user.trim() ? body.user.trim() : 'thought-drop-user';
  const useOcr = Boolean(body.useOcr);

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const difyBaseUrl = (process.env.DIFY_API_BASE_URL ?? '').trim().replace(/\/$/, '');
  const difyApiKey = (process.env.DIFY_API_KEY ?? '').trim();
  const openaiApiKey = (process.env.OPENAI_API_KEY ?? '').trim();
  const model = (process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL);

  // For streaming, we only support OpenAI path
  if (!openaiApiKey) {
    res.status(503).json({ error: 'OPENAI_API_KEY is required for streaming endpoint' });
    return;
  }

  let signedImageUrl: string | undefined;
  let uploadedInfo: { bucket: string; key: string; mime: string } | undefined;
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
      uploadedInfo = { bucket: uploaded.bucket, key: uploaded.key, mime: parsed.mimeType };
      signedImageUrl = await createSignedObjectUrl({ bucket: uploaded.bucket, key: uploaded.key, expiresInSec: 300 });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: `failed to process screenshot: ${detail}` });
      return;
    }
  }

  // Optionally run OCR (synchronous, v0.5: via LLM vision)
  let ocrText: string | undefined;
  try {
    if (useOcr && signedImageUrl) {
      const ocrPayload = {
        model,
        messages: [
          { role: 'system', content: 'You transcribe on-screen text from an image. Output only plain text; no commentary.' },
          { role: 'user', content: [
            { type: 'text', text: 'Transcribe all visible text in the image. Keep line breaks.' },
            { type: 'image_url', image_url: { url: signedImageUrl, detail: 'high' } },
          ] },
        ],
        temperature: 0,
      } as any;
      const ocrResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(ocrPayload),
      });
      const ocrRaw = await ocrResp.text();
      try {
        const ocrParsed = ocrRaw ? JSON.parse(ocrRaw) : {};
        const text = ocrParsed.choices?.[0]?.message?.content;
        if (typeof text === 'string' && text.trim()) {
          ocrText = text.trim().slice(0, 6000);
        }
      } catch {}
    }
  } catch {}

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  (res as any).flushHeaders?.();

  let ended = false;
  const endStream = (err?: unknown) => {
    if (ended) return;
    if (err) {
      try { res.write(`event: error\n`); res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`); } catch {}
    }
    try { res.write(`event: done\n`); res.write(`data: [DONE]\n\n`); } catch {}
    res.end(); ended = true;
  };

  // Persist ask shell (without answer yet)
  let askId: number | undefined;
  try {
    const info = db.prepare(`
      INSERT INTO ai_asks (user, message, s3_bucket, s3_key, mime_type, ocr_text, answer_model)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      user,
      message,
      uploadedInfo?.bucket ?? null,
      uploadedInfo?.key ?? null,
      uploadedInfo?.mime ?? null,
      ocrText ?? null,
      model,
    );
    askId = Number(info.lastInsertRowid);
  } catch {}

  try {
    const userParts: any[] = [{ type: 'text', text: message }];
    if (ocrText) userParts.push({ type: 'text', text: `\n[OCR]\n${ocrText}` });
    if (signedImageUrl) userParts.push({ type: 'image_url', image_url: { url: signedImageUrl, detail: 'high' } });
    const payload = {
      model,
      messages: [
        { role: 'system', content: 'You are a concise assistant. Use both the image and OCR text if provided. Provide concrete, actionable steps in Japanese.' },
        { role: 'user', content: userParts },
      ],
      temperature: 0.2,
      stream: true,
    } as any;

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text();
      endStream({ status: upstream.status, raw });
      return;
    }

    const decoder = new TextDecoder();
    const reader = (upstream.body as any).getReader?.();
    if (!reader) { endStream('stream reader not available'); return; }

    let buffer = '';
    let fullText = '';
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
          if (data === '[DONE]') { endStream(); return; }
          try {
            const json = JSON.parse(data) as any;
            const delta: string | undefined = json.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta) {
              fullText += delta;
              res.write(`data: ${JSON.stringify({ delta })}\n\n`);
            }
          } catch { /* ignore */ }
        }
      }
    }

    // finalize
    try {
      if (askId) {
        db.prepare(`
          UPDATE ai_asks
          SET answer = ?, usage_prompt_tokens = COALESCE(usage_prompt_tokens, NULL), usage_completion_tokens = COALESCE(usage_completion_tokens, NULL)
          WHERE id = ?
        `).run(fullText || null, askId);
      }
    } catch {/* ignore */}
    endStream();
  } catch (err) {
    endStream(err instanceof Error ? err.message : String(err));
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

// ── Insight chatbot helpers ──

interface InsightMemoRow {
  id: number;
  content: string;
  status: string | null;
  resolved: number;
  created_at: string;
  mode: string;
  stuck_minutes: number;
  tags: string;
}

function formatMemosForContext(memos: InsightMemoRow[]): string {
  return memos.map((m, i) => {
    const parts = [`[${i + 1}] ${formatJst(m.created_at)}`, `内容: ${m.content}`];
    if (m.status) parts.push(`ステータス: ${m.status}`);
    if (m.resolved) parts.push('解決済み');
    if (m.stuck_minutes > 0) parts.push(`詰まり時間: ${m.stuck_minutes}分`);
    if (m.tags) parts.push(`タグ: ${m.tags}`);
    return parts.join(' | ');
  }).join('\n');
}

function buildInsightSystemPrompt(from: string, to: string, count: number, memoContext: string): string {
  return `あなたはソフトウェアエンジニアの思考ログを分析するアシスタントです。

以下は${from}から${to}までの期間に記録された${count}件の思考メモです。各メモには投稿日時、内容、ステータス（集中/調査中/詰まり/レビュー待ち）、解決状態、タグなどが含まれています。

--- 思考ログ ---
${memoContext}
--- ログ終わり ---

上記のログを分析し、以下の観点でインサイトを提供してください：

## 分析の観点
1. **全体傾向**: この期間の活動パターン（忙しさ、集中度、作業リズム）
2. **詰まりポイント**: 「詰まり」ステータスのメモに注目し、共通する課題やボトルネックを特定
3. **成長・進捗**: 解決できた課題の傾向、学びのパターン
4. **タグ分析**: よく出現するタグやトピックの傾向
5. **改善提案**: 今後の作業効率を上げるための具体的な提案（2-3個）

## 出力ルール
- 日本語で回答すること
- 各セクションは見出し（##）で区切ること
- 具体的なメモの内容を引用しながら分析すること
- 最後に「まとめ」セクションを入れること
- 実用的で、エンジニアの日常改善に役立つアドバイスを含めること`;
}

// v2: Insight analysis streaming via Gemini (SSE)
const GEMINI_API_KEY = 'AIzaSyD4pg6F532Bb7Edk3LnIni9kFDEwa6u7bM';
const GEMINI_MODEL = 'gemini-2.5-flash';

router.post('/insight/stream', async (req: Request, res: Response) => {
  const body = req.body as { from?: unknown; to?: unknown; question?: unknown };
  const from = normalizeDate(body.from);
  const to = normalizeDate(body.to);
  if (!from || !to || from > to) {
    res.status(400).json({ error: 'from/to must be valid dates and from <= to' });
    return;
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';

  // Fetch memos for the period
  const memos = db.prepare(`
    SELECT m.id, m.content, m.status, m.resolved, m.created_at, m.mode, m.stuck_minutes,
           COALESCE(GROUP_CONCAT(t.name), '') as tags
    FROM memos m
    LEFT JOIN memo_tags mt ON m.id = mt.memo_id
    LEFT JOIN tags t ON mt.tag_id = t.id
    WHERE date(datetime(m.created_at, '+9 hours')) BETWEEN ? AND ?
    GROUP BY m.id
    ORDER BY m.created_at ASC
    LIMIT 500
  `).all(from, to) as InsightMemoRow[];

  if (memos.length === 0) {
    res.status(200).json({ error: '対象期間にメモがありません。', count: 0 });
    return;
  }

  const memoContext = formatMemosForContext(memos);
  const systemPrompt = buildInsightSystemPrompt(from, to, memos.length, memoContext);
  const userMessage = question || `${from}から${to}までの思考ログを分析して、インサイトを教えてください。`;

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
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
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
    const upstream = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.4 },
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text();
      endStream(502, { error: 'Gemini API failed', status: upstream.status, detail: raw });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const reader = (upstream.body as any).getReader?.();
    if (!reader) {
      endStream(500, { error: 'ReadableStream reader not available' });
      return;
    }

    const processLine = (line: string) => {
      line = line.trim();
      if (!line.startsWith('data:')) return;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') return;
      try {
        const json = JSON.parse(data) as any;
        const text: string | undefined = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === 'string' && text.length > 0) {
          res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
        }
      } catch {
        // ignore parse errors
      }
    };

    const pump = async (): Promise<void> => {
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Gemini SSE uses \r\n\r\n or \n\n as delimiter
          buffer = buffer.replace(/\r\n/g, '\n');
          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            for (const line of chunk.split('\n')) {
              processLine(line);
            }
          }
        }
        // Process any remaining data in the buffer
        if (buffer.trim()) {
          for (const line of buffer.split('\n')) {
            processLine(line);
          }
        }
        endStream();
      } catch (err) {
        endStream(500, { error: 'stream error', detail: err instanceof Error ? err.message : String(err) });
      }
    };

    void pump();
  } catch (error) {
    endStream(502, { error: 'failed to call Gemini API', detail: error instanceof Error ? error.message : String(error) });
  }
});

export default router;

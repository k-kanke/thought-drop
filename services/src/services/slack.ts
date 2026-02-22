import os from 'os';
import { MemoRequest } from '../types/memo';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const STATUS_EMOJI: Record<string, string> = {
  '集中':         '🎯',
  '調査中':       '🔍',
  '詰まり':       '🚨',
  'レビュー待ち': '⏳',
  'info':         'ℹ️',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatMessage(memo: MemoRequest, timestamp: string): string {
  const status = memo.status ?? 'info';
  const emoji = STATUS_EMOJI[status] ?? '📝';
  const userName = memo.user?.trim() || process.env.USER_NAME || os.hostname();

  // JST表示（UTC+9）
  const jst = new Date(new Date(timestamp).getTime() + 9 * 60 * 60 * 1000);
  const timeStr = jst.toISOString().replace('T', ' ').slice(0, 19) + ' JST';

  return [
    `${emoji} *[${status}]* ${memo.content}`,
    `_${userName} · ${timeStr}_`,
  ].join('\n');
}

export async function sendToSlack(memo: MemoRequest): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL is not set in environment variables');
  }

  const timestamp = memo.timestamp ?? new Date().toISOString();

  const payload = {
    text: formatMessage(memo, timestamp),
  };

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook returned status ${response.status}`);
      }

      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[Slack] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError ?? new Error('Failed to send to Slack after all retries');
}

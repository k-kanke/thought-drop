export interface MemoRequest {
  content: string;
  status?: string;
  user?: string;
  timestamp?: string;
  screenshotDataUrl?: string;
  mode?: 'instant' | 'stockpile' | string;
  stuckMinutes?: number;
  tags?: string[];
}

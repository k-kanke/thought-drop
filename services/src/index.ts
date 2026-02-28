import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import memoRouter from './routes/memo';
import statsRouter from './routes/stats';
import tagsRouter from './routes/tags';
import characterRouter from './routes/character';
import aiRouter from './routes/ai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

// Basic Auth (optional): protect all API routes with BASIC_AUTH_USER/PASS
function shouldBypassAuth(req: express.Request): boolean {
  // health or static uploads can be public
  if (req.method === 'OPTIONS') return true;
  if (req.path === '/' || req.path === '/health') return true;
  if (req.path.startsWith('/uploads/')) return true;
  return false;
}

app.use((req, res, next) => {
  const user = (process.env.BASIC_AUTH_USER || '').trim();
  const pass = (process.env.BASIC_AUTH_PASS || '').trim();
  if (!user || !pass) return next();
  if (shouldBypassAuth(req)) return next();

  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="ThoughtDrop"');
    res.status(401).send('Authentication required');
    return;
  }
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const u = idx >= 0 ? decoded.slice(0, idx) : decoded;
    const p = idx >= 0 ? decoded.slice(idx + 1) : '';
    if (u === user && p === pass) return next();
  } catch {}
  res.setHeader('WWW-Authenticate', 'Basic realm="ThoughtDrop"');
  res.status(401).send('Invalid credentials');
});

app.use('/api/memo', memoRouter);
app.use('/api/stats', statsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/character', characterRouter);
app.use('/api/ai', aiRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

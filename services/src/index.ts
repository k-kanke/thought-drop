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
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

app.use('/api/memo', memoRouter);
app.use('/api/stats', statsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/character', characterRouter);
app.use('/api/ai', aiRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

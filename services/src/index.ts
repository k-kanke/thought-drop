import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import memoRouter from './routes/memo';
import statsRouter from './routes/stats';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/memo', memoRouter);
app.use('/api/stats', statsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

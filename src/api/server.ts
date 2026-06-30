import express from 'express';
import { mediaRouter } from './routes/media';
import { logger } from '../core/logger';
import path from 'path';

export const app = express();

app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../../public')));

// Serve uploaded images for frontend preview
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/v1/media', mediaRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal Server Error' });
});


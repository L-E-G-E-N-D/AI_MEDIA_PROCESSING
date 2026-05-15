import express from 'express';
import { mediaRouter } from './routes/media';
import { logger } from '../core/logger';

export const app = express();

app.use(express.json());

// Routes
app.use('/api/v1/media', mediaRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal Server Error' });
});

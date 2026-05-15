import { Worker } from 'bullmq';
import { MEDIA_QUEUE_NAME } from '../core/queue';
import { config } from '../core/config';
import { logger } from '../core/logger';
import { processMediaJob } from './processors/mediaProcessor';

export const runWorker = async () => {
  const worker = new Worker(
    MEDIA_QUEUE_NAME,
    async (job) => {
      logger.info({ jobId: job.id }, 'Processing media job');
      await processMediaJob(job);
    },
    {
      connection: {
        url: config.redisUrl,
      },
      concurrency: 5, // Limit concurrent heavy operations
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Job failed');
  });
};

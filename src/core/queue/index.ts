import { Queue } from 'bullmq';
import { config } from '../config';

export const MEDIA_QUEUE_NAME = 'media-processing-queue';

export const mediaQueue = new Queue(MEDIA_QUEUE_NAME, {
  connection: {
    url: config.redisUrl,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
  },
});

import { Request, Response } from 'express';
import { prisma } from '../../core/database';
import { mediaQueue } from '../../core/queue';
import { logger } from '../../core/logger';

export const mediaController = {
  uploadMedia: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided.' });
        return;
      }

      const job = await prisma.mediaJob.create({
        data: {
          filename: req.file.originalname,
          filePath: req.file.path,
          status: 'PENDING',
        },
      });

      await mediaQueue.add('process-media', {
        jobId: job.id,
        filePath: job.filePath,
      });

      logger.info({ jobId: job.id }, 'Media uploaded and job enqueued');

      res.status(202).json({
        message: 'Media accepted for processing.',
        jobId: job.id,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error during media upload');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  getMediaStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const jobId = req.params.jobId as string;

      const job: any = await prisma.mediaJob.findUnique({
        where: { id: jobId },
        include: { analysisResult: true },
      });

      if (!job) {
        res.status(404).json({ error: 'Job not found.' });
        return;
      }

      res.status(200).json({
        jobId: job.id,
        status: job.status,
        result: job.analysisResult || null,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching media status');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
};

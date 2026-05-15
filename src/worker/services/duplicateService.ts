import imghash from 'imghash';
import { prisma } from '../../core/database';
import { logger } from '../../core/logger';

export const calculatePHash = async (filePath: string): Promise<string> => {
  try {
    // 16 represents the hash length, a standard size
    const hash = await imghash.hash(filePath, 16);
    return hash;
  } catch (error: any) {
    logger.error({ err: error, filePath }, 'Failed to calculate pHash');
    throw new Error('Failed to compute perceptual hash');
  }
};

export const checkIsDuplicate = async (phash: string, currentJobId: string): Promise<boolean> => {
  try {
    const existing = await prisma.mediaAnalysisResult.findFirst({
      where: {
        phash: phash,
        jobId: {
          not: currentJobId // Exclude the current job if it somehow exists
        }
      }
    });
    
    return existing !== null;
  } catch (error) {
    logger.error({ err: error }, 'Failed to query for duplicate phash');
    throw new Error('Failed to check duplicates');
  }
};

import { Job } from 'bullmq';
import { prisma } from '../../core/database';
import { logger } from '../../core/logger';
import { analyzeImageWithOpenCV } from '../services/opencvService';
import { calculatePHash, checkIsDuplicate } from '../services/duplicateService';
import { extractOcrAndPlate } from '../services/ocrService';
import { checkIsScreenshot } from '../services/screenshotService';

export const processMediaJob = async (job: Job) => {
  const { jobId, filePath } = job.data;

  await prisma.mediaJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING' },
  });

  try {

    const [openCvResult, phash, ocrResult, isScreenshot] = await Promise.all([
      analyzeImageWithOpenCV(filePath),
      calculatePHash(filePath),
      extractOcrAndPlate(filePath),
      checkIsScreenshot(filePath)
    ]);

    const isDuplicate = await checkIsDuplicate(phash, jobId);

    await prisma.mediaAnalysisResult.create({
      data: {
        jobId,
        phash,
        isDuplicate,
        ocrText: ocrResult.ocrText,
        numberPlate: ocrResult.numberPlate,
        blurScore: openCvResult.blurScore,
        brightnessScore: openCvResult.brightnessScore,
        isScreenshot,
        confidenceScores: {
          plate: ocrResult.plateConfidence,
        }
      },
    });

    await prisma.mediaJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED' },
    });

  } catch (error: any) {
    logger.error({ jobId, err: error }, 'Error processing media heuristics');

    await prisma.mediaJob.update({
      where: { id: jobId },
      data: { status: 'FAILED' },
    });

    await prisma.mediaAnalysisResult.upsert({
      where: { jobId },
      update: { errorLog: error.message },
      create: {
        jobId,
        errorLog: error.message
      }
    });

    throw error; // Re-throw so BullMQ knows it failed and can apply backoff retries
  }
};

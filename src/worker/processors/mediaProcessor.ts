import { Job } from 'bullmq';
import { prisma } from '../../core/database';
import { logger } from '../../core/logger';

export const processMediaJob = async (job: Job) => {
  const { jobId, filePath } = job.data;

  // 1. Update status to PROCESSING
  await prisma.mediaJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING' },
  });

  try {
    // TODO: Implement actual heuristics (OpenCV, pHash, Tesseract)
    const ocrText = "Sample Extracted Text DL 4C AW 2342";
    const numberPlate = "DL 4C AW 2342";
    const blurScore = 150.5;
    const brightnessScore = 120.0;
    const isScreenshot = false;
    const phash = "1a2b3c4d5e6f7g8h";

    // Mock duplicate check
    const isDuplicate = false;

    // 2. Save results
    await prisma.mediaAnalysisResult.create({
      data: {
        jobId,
        phash,
        isDuplicate,
        ocrText,
        numberPlate,
        blurScore,
        brightnessScore,
        isScreenshot,
        confidenceScores: {
          ocr: 0.9,
          plate: 0.95
        }
      },
    });

    // 3. Update status to COMPLETED
    await prisma.mediaJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED' },
    });

  } catch (error: any) {
    logger.error({ jobId, err: error }, 'Error processing media heuristics');
    
    // Fallback: update status to FAILED
    await prisma.mediaJob.update({
      where: { id: jobId },
      data: { status: 'FAILED' },
    });
    
    // Save error log to result
    await prisma.mediaAnalysisResult.upsert({
      where: { jobId },
      update: { errorLog: error.message },
      create: {
        jobId,
        errorLog: error.message
      }
    });

    throw error; // Re-throw so BullMQ knows it failed
  }
};

import Tesseract from 'tesseract.js';
import { logger } from '../../core/logger';
import fs from 'fs';

export interface OcrResult {
  ocrText: string;
  numberPlate: string | null;
  plateConfidence: number;
}

export const extractOcrAndPlate = async (filePath: string): Promise<OcrResult> => {
  try {
    const { data: { text } } = await Tesseract.recognize(
      filePath,
      'eng',
      { logger: m => logger.debug(m) }
    );

    // Clean up temporary cropped plate image to keep storage tidy
    if (filePath.includes('_plate.png')) {
      fs.unlink(filePath, (err) => {
        if (err) logger.warn({ err, filePath }, 'Failed to delete temporary cropped plate');
      });
    }

    const cleanText = text.replace(/\\n/g, ' ').trim();
    const upperText = cleanText.toUpperCase();

    const indianPlateRegex = /([A-Z]{2}[ -]?[0-9]{1,2}(?:[ -]?[A-Z])?(?:[ -]?[A-Z]*)?[ -]?[0-9]{1,4})/g;
    
    const matches = upperText.match(indianPlateRegex);
    const numberPlate = matches ? matches[0] : null;

    let plateConfidence = 0;
    if (numberPlate) {
      plateConfidence = 0.9; // We found a regex match
    } else if (cleanText.length > 5 && cleanText.length < 15) {
      plateConfidence = 0.4; // Found short text, might be a malformed plate
    }

    return {
      ocrText: cleanText,
      numberPlate,
      plateConfidence,
    };
  } catch (error: any) {
    if (filePath.includes('_plate.png')) {
      fs.unlink(filePath, () => {});
    }
    logger.error({ err: error, filePath }, 'Failed to extract OCR');
    throw new Error('Failed to run OCR analysis');
  }
};

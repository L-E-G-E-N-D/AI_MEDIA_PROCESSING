import Tesseract from 'tesseract.js';
import { logger } from '../../core/logger';

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

    const cleanText = text.replace(/\\n/g, ' ').trim();

    const indianPlateRegex = /([A-Z]{2}[ -]?[0-9]{1,2}(?:[ -]?[A-Z])?(?:[ -]?[A-Z]*)?[ -]?[0-9]{4})/g;
    
    const matches = cleanText.match(indianPlateRegex);
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
    logger.error({ err: error, filePath }, 'Failed to extract OCR');
    throw new Error('Failed to run OCR analysis');
  }
};

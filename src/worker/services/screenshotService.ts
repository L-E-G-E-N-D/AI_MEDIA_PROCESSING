import exifr from 'exifr';
import { logger } from '../../core/logger';

export const checkIsScreenshot = async (filePath: string): Promise<boolean> => {
  try {

    const exifData = await exifr.parse(filePath, ['Make', 'Model', 'DateTimeOriginal', 'Software']);
    
    if (!exifData) {

      return true;
    }

    if (exifData.Software && exifData.Software.toLowerCase().includes('screenshot')) {
      return true;
    }

    if (exifData.Make || exifData.Model) {
      return false;
    }

    return false;
  } catch (error: any) {
    logger.warn({ err: error, filePath }, 'Failed to parse EXIF data, assuming false for screenshot');
    return false;
  }
};

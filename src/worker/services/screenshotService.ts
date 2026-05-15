import exifr from 'exifr';
import { logger } from '../../core/logger';

export const checkIsScreenshot = async (filePath: string): Promise<boolean> => {
  try {
    // Read EXIF data. If it's a raw photo from a camera, it will have Make/Model or DateTimeOriginal.
    // Screenshots typically strip all EXIF metadata.
    const exifData = await exifr.parse(filePath, ['Make', 'Model', 'DateTimeOriginal', 'Software']);
    
    if (!exifData) {
      // No EXIF data at all strongly correlates with a screenshot or processed web image
      return true;
    }

    // Sometimes screenshots have 'Software' tag set to the OS screenshot tool
    if (exifData.Software && exifData.Software.toLowerCase().includes('screenshot')) {
      return true;
    }

    // If it has camera Make/Model, it's highly likely an original photo
    if (exifData.Make || exifData.Model) {
      return false;
    }

    // Default to false if we aren't sure, to reduce false positives
    return false;
  } catch (error: any) {
    logger.warn({ err: error, filePath }, 'Failed to parse EXIF data, assuming false for screenshot');
    return false;
  }
};

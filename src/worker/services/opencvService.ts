import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execAsync = util.promisify(exec);

export interface OpenCVResult {
  blurScore: number;
  brightnessScore: number;
}

export const analyzeImageWithOpenCV = async (filePath: string): Promise<OpenCVResult> => {
  const pythonScript = path.join(__dirname, 'opencv.py');
  
  try {
    // Assuming python3 is available in the environment (e.g. docker or local)
    const { stdout, stderr } = await execAsync(`python3 ${pythonScript} "${filePath}"`);
    
    if (stderr && !stdout) {
      throw new Error(`Python OpenCV Error: ${stderr}`);
    }

    const result = JSON.parse(stdout.trim());
    
    if (result.error) {
      throw new Error(`OpenCV Error: ${result.error}`);
    }

    return {
      blurScore: result.blur_score,
      brightnessScore: result.brightness_score,
    };
  } catch (error: any) {
    throw new Error(`Failed to execute OpenCV analysis: ${error.message}`);
  }
};

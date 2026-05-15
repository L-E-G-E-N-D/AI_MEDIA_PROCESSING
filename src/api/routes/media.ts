import { Router } from 'express';
import { upload } from '../middlewares/upload';
import { mediaController } from '../controllers/mediaController';

export const mediaRouter = Router();

mediaRouter.post('/upload', upload.single('image'), mediaController.uploadMedia);
mediaRouter.get('/:jobId', mediaController.getMediaStatus);

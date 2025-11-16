import express from 'express';
import ImageController from '../controllers/ImageController.js';

const router = express.Router();

router.get('/', ImageController.getAll);
router.get('/:id', ImageController.getById);
router.get('/:id/download', ImageController.download);
router.delete('/:id', ImageController.delete);

export default router;
import express from 'express';
import PromptController from '../controllers/PromptController.js';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.get('/', PromptController.getAll);
router.post('/', PromptController.create);
router.post('/upload', upload.single('file'), PromptController.uploadFile);
router.put('/:id', PromptController.update);
router.delete('/:id', PromptController.delete);

export default router;
import express from 'express';
import JobController from '../controllers/JobController.js';

const router = express.Router();

router.get('/', JobController.getAll);
router.get('/stats', JobController.getStats);
router.get('/:id', JobController.getById);
router.post('/generate', JobController.generateImages);
router.post('/:id/retry', JobController.retry);
router.delete('/:id', JobController.cancel);

export default router;
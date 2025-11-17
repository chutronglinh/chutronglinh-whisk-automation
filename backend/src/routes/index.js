import express from 'express';
import multer from 'multer';
import AccountController from '../controllers/AccountController.js';
import PromptController from '../controllers/PromptController.js';
import ProjectController from '../controllers/ProjectController.js';
import GenerateController from '../controllers/GenerateController.js';
import JobController from '../controllers/JobController.js';
import ImageController from '../controllers/ImageController.js';

const router = express.Router();

// Multer configuration for file uploads
const upload = multer({
  dest: '/tmp/uploads',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Account routes
router.get('/accounts', AccountController.getAll);
router.get('/accounts/stats', AccountController.getStats);
router.get('/accounts/:id', AccountController.getById);
router.post('/accounts', AccountController.create);
router.post('/accounts/import', upload.single('file'), AccountController.importCSV);
router.put('/accounts/:id', AccountController.update);
router.delete('/accounts/:id', AccountController.delete);
router.post('/accounts/:id/simple-login', AccountController.startSimpleLogin);
router.post('/accounts/:id/extract-cookie', AccountController.extractCookie);

// Prompt routes
router.get('/prompts', PromptController.getAll);
router.get('/prompts/:id', PromptController.getById);
router.post('/prompts', PromptController.create);
router.put('/prompts/:id', PromptController.update);
router.delete('/prompts/:id', PromptController.delete);

// Project routes
router.get('/projects', ProjectController.getAll);
router.get('/projects/:id', ProjectController.getById);
router.post('/accounts/:accountId/projects', ProjectController.createForAccount);
router.delete('/projects/:id', ProjectController.delete);

// Generate routes
router.post('/generate/start', GenerateController.startGeneration);
router.get('/generate/status/:jobId', GenerateController.getJobStatus);
router.get('/generate/queue-status', GenerateController.getQueueStatus);

// Job routes
router.get('/jobs', JobController.getAll);
router.get('/jobs/stats', JobController.getStats);
router.get('/jobs/:id', JobController.getById);
router.post('/jobs/generate', JobController.generateImages);
router.post('/jobs/:id/retry', JobController.retry);
router.delete('/jobs/:id', JobController.cancel);

// Image routes
router.get('/images', ImageController.getAll);
router.get('/images/:id', ImageController.getById);
router.get('/images/:id/download', ImageController.download);
router.delete('/images/:id', ImageController.delete);

// Additional stats and utility routes
router.get('/prompts/categories', PromptController.getCategories);
router.get('/prompts/stats', PromptController.getStats);
router.get('/projects/stats', ProjectController.getStats);
router.get('/accounts/:accountId/projects', ProjectController.getByAccount);

export default router;
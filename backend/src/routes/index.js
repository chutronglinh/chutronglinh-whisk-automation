import express from 'express';
import multer from 'multer';
import AccountController from '../controllers/AccountController.js';
import PromptController from '../controllers/PromptController.js';
import ProjectController from '../controllers/ProjectController.js';
import GenerateController from '../controllers/GenerateController.js';

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
router.get('/generate/status/:projectId', GenerateController.getJobStatus);
router.get('/generate/queue-status', GenerateController.getQueueStatus);

export default router;
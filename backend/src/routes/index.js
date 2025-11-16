import express from 'express';
import AccountController from '../controllers/AccountController.js';
import PromptController from '../controllers/PromptController.js';
import ProjectController from '../controllers/ProjectController.js';
import GenerateController from '../controllers/GenerateController.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ============================================
// ACCOUNT ROUTES
// ============================================
router.get('/accounts', AccountController.getAll);
router.get('/accounts/stats', AccountController.getStats);
router.get('/accounts/:id', AccountController.getById);
router.post('/accounts', AccountController.create);
router.put('/accounts/:id', AccountController.update);
router.delete('/accounts/:id', AccountController.delete);
router.post('/accounts/import', upload.single('file'), AccountController.importCSV);

// Account actions
router.post('/accounts/:id/manual-login', AccountController.startManualLogin);
router.post('/accounts/:id/simple-login', AccountController.startSimpleLogin);
router.post('/accounts/:id/extract-cookie', AccountController.extractCookie);

// ============================================
// PROMPT ROUTES
// ============================================
router.get('/prompts', PromptController.getAll);
router.get('/prompts/stats', PromptController.getStats);
router.get('/prompts/categories', PromptController.getCategories);
router.get('/prompts/:id', PromptController.getById);
router.post('/prompts', PromptController.create);
router.put('/prompts/:id', PromptController.update);
router.delete('/prompts/:id', PromptController.delete);
router.post('/prompts/import', PromptController.importJSON);

// ============================================
// PROJECT ROUTES
// ============================================
router.get('/projects', ProjectController.getAll);
router.get('/projects/stats', ProjectController.getStats);
router.get('/projects/:id', ProjectController.getById);
router.delete('/projects/:id', ProjectController.delete);
router.get('/accounts/:accountId/projects', ProjectController.getByAccount);
router.post('/accounts/:accountId/projects', ProjectController.createForAccount);

// ============================================
// GENERATION ROUTES
// ============================================
router.post('/generate/start', GenerateController.startGeneration);
router.get('/generate/status/:jobId', GenerateController.getJobStatus);
router.get('/generate/stats', GenerateController.getStats);
router.get('/generate/queue-status', GenerateController.getQueueStatus);

// Generated images
router.get('/generated-images', GenerateController.getAllImages);
router.get('/generated-images/:id', GenerateController.getImageById);
router.delete('/generated-images/:id', GenerateController.deleteImage);

// ============================================
// HEALTH CHECK
// ============================================
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 404 HANDLER
// ============================================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

export default router;
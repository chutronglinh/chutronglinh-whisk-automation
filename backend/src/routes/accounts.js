import express from 'express';
import multer from 'multer';
import AccountController from '../controllers/AccountController.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Routes
router.get('/', AccountController.getAll);
router.get('/stats', AccountController.getStats);
router.get('/:id', AccountController.getById);
router.post('/', AccountController.create);
router.post('/import-csv', upload.single('file'), AccountController.importCSV);
router.post('/:id/manual-login', AccountController.startManualLogin); // Auto login
router.post('/:id/simple-login', AccountController.startSimpleLogin); // MỚI - Manual login
router.put('/:id', AccountController.update);
router.delete('/:id', AccountController.delete);

export default router;
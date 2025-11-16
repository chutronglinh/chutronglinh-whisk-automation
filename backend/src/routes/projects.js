import express from 'express';
import ProjectController from '../controllers/ProjectController.js';

const router = express.Router();

router.get('/', ProjectController.getAll);
router.get('/:id', ProjectController.getById);
router.post('/create', ProjectController.createProjects);
router.delete('/:id', ProjectController.delete);

export default router;
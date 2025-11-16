import express from 'express';
import AccountController from '../controllers/AccountController.js';

const router = express.Router();

router.get('/', AccountController.getAll);
router.get('/:id', AccountController.getById);
router.post('/', AccountController.create);
router.put('/:id', AccountController.update);
router.delete('/:id', AccountController.delete);
router.post('/import', AccountController.importAccounts);
router.post('/:id/setup-profile', AccountController.setupProfile);
router.post('/:id/extract-cookie', AccountController.extractCookie);

export default router;
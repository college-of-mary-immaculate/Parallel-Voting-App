import express from 'express';
import { UserController } from '../controllers/userController.js';

const router = express.Router();

// Public routes
router.post('/register', UserController.register);
router.post('/login', UserController.login);

// Protected routes (require authentication)
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.put('/password', UserController.changePassword);
router.get('/voting-history', UserController.getVotingHistory);

// Admin only routes
router.get('/all', UserController.getAllUsers);
router.patch('/:id/status', UserController.updateUserStatus);

export default router;

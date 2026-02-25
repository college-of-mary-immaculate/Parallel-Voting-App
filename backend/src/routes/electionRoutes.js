import express from 'express';
import { ElectionController } from '../controllers/electionController.js';

const router = express.Router();

// Get all elections
router.get('/', ElectionController.getAllElections);

// Get active elections
router.get('/active', ElectionController.getActiveElections);

// Get upcoming elections
router.get('/upcoming', ElectionController.getUpcomingElections);

// Get election by ID
router.get('/:id', ElectionController.getElectionById);

// Get election results
router.get('/:id/results', ElectionController.getElectionResults);

// Create new election (protected route - admin only)
router.post('/', ElectionController.createElection);

// Update election (protected route - admin only)
router.put('/:id', ElectionController.updateElection);

// Delete election (protected route - admin only)
router.delete('/:id', ElectionController.deleteElection);

export default router;

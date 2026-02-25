import express from 'express';
import { CandidateController } from '../controllers/candidateController.js';

const router = express.Router();

// Get all candidates
router.get('/', CandidateController.getAllCandidates);

// Get candidate by ID
router.get('/:id', CandidateController.getCandidateById);

// Get candidates by election
router.get('/election/:electionId', CandidateController.getCandidatesByElection);

// Get candidate statistics
router.get('/:id/stats', CandidateController.getCandidateStats);

// Create new candidate (protected route - admin only)
router.post('/', CandidateController.createCandidate);

// Update candidate (protected route - admin only)
router.put('/:id', CandidateController.updateCandidate);

// Delete candidate (protected route - admin only)
router.delete('/:id', CandidateController.deleteCandidate);

// Toggle candidate status (protected route - admin only)
router.patch('/:id/status', CandidateController.toggleCandidateStatus);

export default router;

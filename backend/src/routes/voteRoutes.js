import express from 'express';
import { VoteController } from '../controllers/voteController.js';

const router = express.Router();

// Protected routes (require authentication)
router.post('/cast', VoteController.castVote);
router.get('/check/:electionId', VoteController.checkVoteStatus);
router.get('/results/:electionId/realtime', VoteController.getRealTimeResults);

// Admin only routes
router.get('/election/:electionId', VoteController.getElectionVotes);
router.get('/stats/:electionId', VoteController.getVotingStats);
router.patch('/:voteId/verify', VoteController.verifyVote);
router.delete('/:voteId', VoteController.deleteVote);

export default router;

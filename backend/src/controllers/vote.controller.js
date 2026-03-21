// ===== voter.controller.js =====
const express = require('express');
const router = express.Router();
const electionService = require('../services/election.service');
const voteService = require('../services/vote.service');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// All routes protected, voter-only
router.use(verifyToken, requireRole('Voter'));

/**
 * List all ACTIVE elections
 */
router.get('/elections', async (req, res) => {
    try {
        const elections = await electionService.listElections();
        const activeElections = elections.filter(e => e.status === 'Active');
        res.json(activeElections);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

/**
 * Get details of a single election (positions + candidates)
 */
router.get('/elections/:id', async (req, res) => {
    try {
        const election = await electionService.getElectionDetails(req.params.id);
        if (election.status !== 'Active') {
            return res.status(403).json({ message: 'Election is not active' });
        }
        res.json(election);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
});

/**
 * Cast votes for an election
 * Expects req.body.votes = [{ position_id, candidate_id }, ...]
 */
router.post('/vote/:electionId', async (req, res) => {
    try {
        const voterId = req.user.id;
        const electionId = req.params.electionId;
        const votes = req.body.votes;

        if (!Array.isArray(votes) || votes.length === 0) {
            return res.status(400).json({ message: 'Votes array required' });
        }

        const io = req.app.get('io'); // get socket.io instance from app
        const result = await voteService.castVote(voterId, electionId, votes, io);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

/**
 * Get my votes
 */
router.get('/myvotes', async (req, res) => {
    try {
        const voterId = req.user.id;
        const votes = await voteService.getVotesByVoter(voterId);
        res.json(votes);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
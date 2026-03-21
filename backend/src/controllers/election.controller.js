const express = require('express');
const router = express.Router();
const electionService = require('../services/election.service');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { pool } = require('../db/db');

// All routes protected and admin-only
router.use(verifyToken, requireRole('Admin'));

// Create election
router.post('/', async (req, res) => {
    try {
        const election = await electionService.createElection(req.body);
        res.status(201).json(election);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update election
router.put('/:id', async (req, res) => {
    try {
        const election = await electionService.updateElection(req.params.id, req.body);
        res.json(election);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete election
router.delete('/:id', async (req, res) => {
    try {
        const result = await electionService.deleteElection(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ message: 'Status is required' });

        const election = await electionService.updateStatus(req.params.id, status);
        res.json(election);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get vote results for an election — must be BEFORE /:id
router.get('/:id/results', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT candidate_id, COUNT(*) as vote_count
             FROM votes
             WHERE election_id = ?
             GROUP BY candidate_id`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get election details
router.get('/:id', async (req, res) => {
    try {
        const election = await electionService.getElectionDetails(req.params.id);
        res.json(election);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
});

// List all elections
router.get('/', async (req, res) => {
    try {
        const elections = await electionService.listElections();
        res.json(elections);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
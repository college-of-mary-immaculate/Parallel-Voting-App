const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

router.get('/', verifyToken, requireRole('Admin'), async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get('/:id', verifyToken, requireRole('Admin'), async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        res.json(user);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
});

module.exports = router;
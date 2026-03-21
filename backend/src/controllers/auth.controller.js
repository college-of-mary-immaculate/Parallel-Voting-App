const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }

        const result = await authService.login(email, password);

        res.json(result);

    } catch (err) {
        res.status(401).json({ message: err.message });
    }
});

router.post('/logout', (req, res) => {
    // JWT logout = client deletes token
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
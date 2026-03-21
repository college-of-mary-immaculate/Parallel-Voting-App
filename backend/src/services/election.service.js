const { readPool, writePool } = require('../db/db');

class ElectionService {

    async createElection({ title, description, start_date, end_date }) {
        if (!title || !start_date || !end_date) {
            throw new Error('Title, start_date, and end_date are required');
        }

        if (new Date(start_date) >= new Date(end_date)) {
            throw new Error('start_date must be before end_date');
        }

        const [result] = await writePool.query(
            `INSERT INTO elections (title, description, start_date, end_date, status)
             VALUES (?, ?, ?, ?, 'Pending')`,
            [title, description || '', start_date, end_date]
        );

        // Use writePool here to avoid replication lag — record may not be on slave yet
        const [election] = await writePool.query('SELECT * FROM elections WHERE id = ?', [result.insertId]);
        return election[0];
    }

    async updateElection(id, { title, description, start_date, end_date }) {
        const [existing] = await readPool.query('SELECT * FROM elections WHERE id = ?', [id]);
        if (existing.length === 0) throw new Error('Election not found');

        if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
            throw new Error('start_date must be before end_date');
        }

        await writePool.query(
            `UPDATE elections SET title = ?, description = ?, start_date = ?, end_date = ?
             WHERE id = ?`,
            [
                title || existing[0].title,
                description || existing[0].description,
                start_date || existing[0].start_date,
                end_date || existing[0].end_date,
                id
            ]
        );

        // Use writePool to avoid replication lag on the updated record
        const [updated] = await writePool.query('SELECT * FROM elections WHERE id = ?', [id]);
        return updated[0];
    }

    async deleteElection(id) {
        const [existing] = await readPool.query('SELECT * FROM elections WHERE id = ?', [id]);
        if (existing.length === 0) throw new Error('Election not found');

        if (existing[0].status === 'Active') {
            throw new Error('Cannot delete an active election');
        }

        await writePool.query('DELETE FROM elections WHERE id = ?', [id]);
        return { message: 'Election deleted' };
    }

    async updateStatus(id, newStatus) {
        const [existing] = await readPool.query('SELECT * FROM elections WHERE id = ?', [id]);
        if (existing.length === 0) throw new Error('Election not found');

        const current = existing[0].status;

        const allowedTransitions = {
            Pending: ['Active'],
            Active: ['Ended'],
            Ended: []
        };

        if (!allowedTransitions[current].includes(newStatus)) {
            throw new Error(`Invalid status transition from ${current} to ${newStatus}`);
        }

        await writePool.query('UPDATE elections SET status = ? WHERE id = ?', [newStatus, id]);

        // Use writePool to avoid replication lag on the updated record
        const [updated] = await writePool.query('SELECT * FROM elections WHERE id = ?', [id]);
        return updated[0];
    }

    async getElectionDetails(id) {
        const [elections] = await readPool.query('SELECT * FROM elections WHERE id = ?', [id]);
        if (elections.length === 0) throw new Error('Election not found');

        const election = elections[0];

        const [positions] = await readPool.query(
            'SELECT * FROM positions WHERE election_id = ?',
            [id]
        );

        for (let pos of positions) {
            const [candidates] = await readPool.query(
                'SELECT * FROM candidates WHERE position_id = ?',
                [pos.id]
            );
            pos.candidates = candidates;
        }

        election.positions = positions;
        return election;
    }

    async listElections() {
        const [rows] = await readPool.query('SELECT * FROM elections ORDER BY created_at DESC');
        return rows;
    }
}

module.exports = new ElectionService();
const { readPool } = require('../db/db');

class UserService {

    async getAllUsers() {
        const [rows] = await readPool.query(
            'SELECT id, name, email, role, created_at FROM users'
        );
        return rows;
    }

    async getUserById(id) {
        const [rows] = await readPool.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            throw new Error('User not found');
        }

        return rows[0];
    }
}

module.exports = new UserService();
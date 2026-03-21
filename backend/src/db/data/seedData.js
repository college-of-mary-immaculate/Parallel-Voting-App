const bcrypt = require('bcryptjs');

async function seedData(conn) {
    console.log('Seeding database...');

    // --- Users: 1 Admin + 5 Voters ---
    const users = [
        { name: 'Admin User', email: 'admin@example.com', password: 'admin123', role: 'Admin' },
        { name: 'Voter 1', email: 'voter1@example.com', password: 'voter123', role: 'Voter' },
        { name: 'Voter 2', email: 'voter2@example.com', password: 'voter123', role: 'Voter' },
        { name: 'Voter 3', email: 'voter3@example.com', password: 'voter123', role: 'Voter' },
        { name: 'Voter 4', email: 'voter4@example.com', password: 'voter123', role: 'Voter' },
        { name: 'Voter 5', email: 'voter5@example.com', password: 'voter123', role: 'Voter' },
    ];

    for (const user of users) {
        try {
            const hash = await bcrypt.hash(user.password, 10);
            await conn.query(
                `INSERT IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
                [user.name, user.email, hash, user.role]
            );
        } catch (err) {
            console.warn(`User ${user.email} already exists, skipping.`);
        }
    }
    console.log('Users seeded');

    // --- Elections (1 sample election) ---
    let electionId;
    try {
        const [electionResult] = await conn.query(
            `INSERT IGNORE INTO elections (title, description, start_date, end_date, status)
             VALUES (?, ?, ?, ?, ?)`,
            ['2026 Student Council Election', 'Election for student council positions', '2026-03-01 08:00:00', '2026-03-05 18:00:00', 'Pending']
        );
        electionId = electionResult.insertId;
    } catch (err) {
        const [rows] = await conn.query(`SELECT id FROM elections WHERE title=?`, ['2026 Student Council Election']);
        electionId = rows[0].id;
    }

    // --- Positions (3 positions) ---
    const positions = [
        { title: 'President', max_votes_per_voter: 1, max_candidates: 5, max_winners: 1 },
        { title: 'Vice President', max_votes_per_voter: 1, max_candidates: 5, max_winners: 1 },
        { title: 'Treasurer', max_votes_per_voter: 1, max_candidates: 5, max_winners: 1 },
    ];

    const positionIds = [];
    for (const pos of positions) {
        try {
            const [posResult] = await conn.query(
                `INSERT IGNORE INTO positions (election_id, title, max_votes_per_voter, max_candidates, max_winners)
                 VALUES (?, ?, ?, ?, ?)`,
                [electionId, pos.title, pos.max_votes_per_voter, pos.max_candidates, pos.max_winners]
            );
            positionIds.push(posResult.insertId);
        } catch {
            const [rows] = await conn.query(`SELECT id FROM positions WHERE election_id=? AND title=?`, [electionId, pos.title]);
            positionIds.push(rows[0].id);
        }
    }
    console.log('Positions seeded');

    // --- Candidates (10 candidates, assigned to 3 positions) ---
    const candidates = [
        { name: 'Alice Johnson', positionIndex: 0 },
        { name: 'Bob Smith', positionIndex: 0 },
        { name: 'Carol Lee', positionIndex: 0 },
        { name: 'David Kim', positionIndex: 1 },
        { name: 'Eva Wong', positionIndex: 1 },
        { name: 'Frank Miller', positionIndex: 1 },
        { name: 'Grace Chen', positionIndex: 2 },
        { name: 'Henry Adams', positionIndex: 2 },
        { name: 'Isabel Diaz', positionIndex: 2 },
        { name: 'Jack Brown', positionIndex: 0 },
    ];

    for (const cand of candidates) {
        try {
            await conn.query(
                `INSERT IGNORE INTO candidates (position_id, name) VALUES (?, ?)`,
                [positionIds[cand.positionIndex], cand.name]
            );
        } catch (err) {
            console.warn(`Candidate ${cand.name} already exists, skipping.`);
        }
    }
    console.log('Candidates seeded');

    console.log('Seeding completed!');
}

module.exports = seedData;
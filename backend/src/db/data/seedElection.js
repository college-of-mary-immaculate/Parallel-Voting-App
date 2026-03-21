const bcrypt = require('bcryptjs');

async function seedElections(conn) {
    console.log('Seeding ACTIVE elections with positions and candidates...');

    // --- Elections ---
    const elections = [
        {
            title: '2026 Student Council Election',
            description: 'Election for student council positions',
            start_date: '2026-03-01 08:00:00',
            end_date: '2026-03-05 18:00:00',
            status: 'Active',
            positions: [
                {
                    title: 'President',
                    max_votes_per_voter: 1,
                    max_candidates: 5,
                    max_winners: 1,
                    candidates: ['Alice Johnson', 'Bob Smith', 'Carol Lee', 'Jack Brown']
                },
                {
                    title: 'Vice President',
                    max_votes_per_voter: 1,
                    max_candidates: 5,
                    max_winners: 1,
                    candidates: ['David Kim', 'Eva Wong', 'Frank Miller']
                },
                {
                    title: 'Treasurer',
                    max_votes_per_voter: 1,
                    max_candidates: 5,
                    max_winners: 1,
                    candidates: ['Grace Chen', 'Henry Adams', 'Isabel Diaz']
                }
            ]
        },
        {
            title: '2026 Sports Club Election',
            description: 'Vote for club leaders in the sports division',
            start_date: '2026-04-01 09:00:00',
            end_date: '2026-04-03 17:00:00',
            status: 'Active',
            positions: [
                {
                    title: 'Chairperson',
                    max_votes_per_voter: 1,
                    max_candidates: 3,
                    max_winners: 1,
                    candidates: ['Tom Hardy', 'Lara Croft', 'Bruce Wayne']
                },
                {
                    title: 'Secretary',
                    max_votes_per_voter: 1,
                    max_candidates: 2,
                    max_winners: 1,
                    candidates: ['Clark Kent', 'Diana Prince']
                }
            ]
        },
        {
            title: '2026 Cultural Committee Election',
            description: 'Election for cultural committee members',
            start_date: '2026-05-01 10:00:00',
            end_date: '2026-05-05 16:00:00',
            status: 'Active',
            positions: [
                {
                    title: 'Head Coordinator',
                    max_votes_per_voter: 1,
                    max_candidates: 3,
                    max_winners: 1,
                    candidates: ['Peter Parker', 'Mary Jane', 'Tony Stark']
                },
                {
                    title: 'Event Manager',
                    max_votes_per_voter: 1,
                    max_candidates: 2,
                    max_winners: 1,
                    candidates: ['Steve Rogers', 'Natasha Romanoff']
                },
                {
                    title: 'Treasurer',
                    max_votes_per_voter: 1,
                    max_candidates: 2,
                    max_winners: 1,
                    candidates: ['Bruce Banner', 'Wanda Maximoff']
                }
            ]
        }
    ];

    for (const election of elections) {
        // Insert election
        let electionId;
        try {
            const [eRes] = await conn.query(
                `INSERT IGNORE INTO elections (title, description, start_date, end_date, status)
                 VALUES (?, ?, ?, ?, ?)`,
                [election.title, election.description, election.start_date, election.end_date, election.status]
            );
            electionId = eRes.insertId;
        } catch {
            const [rows] = await conn.query(`SELECT id FROM elections WHERE title=?`, [election.title]);
            electionId = rows[0].id;
        }

        // Insert positions
        const positionIds = [];
        for (const pos of election.positions) {
            let posId;
            try {
                const [pRes] = await conn.query(
                    `INSERT IGNORE INTO positions 
                     (election_id, title, max_votes_per_voter, max_candidates, max_winners)
                     VALUES (?, ?, ?, ?, ?)`,
                    [electionId, pos.title, pos.max_votes_per_voter, pos.max_candidates, pos.max_winners]
                );
                posId = pRes.insertId;
            } catch {
                const [rows] = await conn.query(`SELECT id FROM positions WHERE election_id=? AND title=?`, [electionId, pos.title]);
                posId = rows[0].id;
            }
            positionIds.push(posId);

            // Insert candidates
            for (const cand of pos.candidates) {
                try {
                    await conn.query(
                        `INSERT IGNORE INTO candidates (position_id, name) VALUES (?, ?)`,
                        [posId, cand]
                    );
                } catch (err) {
                    console.warn(`Candidate ${cand} already exists, skipping.`);
                }
            }
        }
    }

    console.log('All elections are now ACTIVE and seeded!');
}

module.exports = seedElections;
const { readPool, getConnection } = require('../db/db');
const ElectionService = require('./election.service');

/**
 * Cast votes for a voter in an election
 * @param {number} voterId
 * @param {number|string} electionId
 * @param {Array<{position_id:number|string, candidate_id:number|string}>} votes
 * @param {import('socket.io').Server} [io]
 */
async function castVote(voterId, electionId, votes, io) {
    electionId = Number(electionId);
    voterId = Number(voterId);

    // 1️⃣ Get election and check if active
    const election = await ElectionService.getElectionDetails(electionId);
    if (!election) throw new Error('Election not found');
    if (election.status !== 'Active') throw new Error('Election is not active');

    // 2️⃣ Build position map for validation
    const positions = election.positions || [];
    const positionMap = {};
    positions.forEach(p => { positionMap[Number(p.id)] = p; });

    console.log('Positions from DB:', positions.map(p => ({ id: p.id, title: p.title })));
    console.log('Votes payload:', votes);

    // 3️⃣ Check voter hasn't already voted
    const [existingVotes] = await readPool.query(
        `SELECT position_id FROM votes WHERE voter_id = ? AND election_id = ?`,
        [voterId, electionId]
    );
    if (existingVotes.length > 0) {
        throw new Error('You have already voted in this election');
    }

    // 4️⃣ Validate all votes before inserting anything
    for (const vote of votes) {
        const positionId = Number(vote.position_id);
        const candidateId = Number(vote.candidate_id);

        const position = positionMap[positionId];
        if (!position) throw new Error(`Invalid position_id: ${positionId}`);

        const candidateExists = (position.candidates || []).some(c => Number(c.id) === candidateId);
        if (!candidateExists) {
            throw new Error(`Candidate ${candidateId} does not belong to position "${position.title}"`);
        }
    }

    // 5️⃣ Insert votes in a transaction — always uses master via getConnection()
    const conn = await getConnection();
    try {
        await conn.beginTransaction();

        for (const vote of votes) {
            await conn.query(
                `INSERT INTO votes (voter_id, election_id, position_id, candidate_id)
                 VALUES (?, ?, ?, ?)`,
                [voterId, electionId, Number(vote.position_id), Number(vote.candidate_id) || null]
            );
        }

        await conn.commit();

        // 6️⃣ Query results on the SAME master connection immediately after commit
        // so we never hit replication lag on the read replica.
        // This is the fix: using conn (master) instead of readPool (replica).
        if (io) {
            try {
                const [results] = await conn.query(
                    `SELECT candidate_id, COUNT(*) as vote_count
                     FROM votes WHERE election_id = ?
                     GROUP BY candidate_id`,
                    [electionId]
                );
                console.log(`Emitting results:update to election:${electionId}`, results);
                io.to(`election:${electionId}`).emit('results:update', { electionId, results });
                console.log(`Emitted results:update to election:${electionId}`);
            } catch (emitErr) {
                console.error('Failed to emit socket update:', emitErr.message);
                // Don't fail the request over an emit error
            }
        }

    } catch (err) {
        await conn.rollback();
        if (err.code === 'ER_DUP_ENTRY') {
            throw new Error('You have already voted in this election');
        }
        throw new Error(err.message);
    } finally {
        conn.release();
    }

    return { message: 'Vote successfully cast' };
}

/**
 * Get all votes by a voter
 * @param {number} voterId
 */
async function getVotesByVoter(voterId) {
    const [rows] = await readPool.query(
        `SELECT v.*, e.title AS election_title, p.title AS position_title, c.name AS candidate_name
         FROM votes v
         JOIN elections e ON v.election_id = e.id
         JOIN positions p ON v.position_id = p.id
         LEFT JOIN candidates c ON v.candidate_id = c.id
         WHERE v.voter_id = ?`,
        [voterId]
    );
    return rows;
}

module.exports = { castVote, getVotesByVoter };
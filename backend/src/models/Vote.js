import { DatabaseUtils } from '../utils/database.js';

export class Vote {
  static async findById(voteId) {
    return await DatabaseUtils.findOne('Vote', { voteId });
  }

  static async create(voteData) {
    return await DatabaseUtils.create('Vote', voteData);
  }

  static async delete(voteId) {
    return await DatabaseUtils.delete('Vote', { voteId });
  }

  static async findAll(conditions = {}) {
    return await DatabaseUtils.findMany('Vote', conditions);
  }

  static async findByElection(electionId) {
    return await DatabaseUtils.findMany('Vote', { electionId }, '*', 'votedAt DESC');
  }

  static async findByUser(userId) {
    return await DatabaseUtils.findMany('Vote', { userId }, '*', 'votedAt DESC');
  }

  static async findByUserAndElection(userId, electionId) {
    return await DatabaseUtils.findOne('Vote', { userId, electionId });
  }

  static async count(conditions = {}) {
    return await DatabaseUtils.count('Vote', conditions);
  }

  static async countByElection(electionId) {
    return await DatabaseUtils.count('Vote', { electionId });
  }

  static async countByCandidate(candidateId) {
    return await DatabaseUtils.count('Vote', { candidateId });
  }

  static async hasUserVoted(userId, electionId) {
    const vote = await DatabaseUtils.findOne('Vote', { userId, electionId });
    return !!vote;
  }

  static async castVote(userId, electionId, candidateId, ipAddress, userAgent) {
    // Check if user already voted
    if (await this.hasUserVoted(userId, electionId)) {
      throw new Error('User has already voted in this election');
    }

    const voteData = {
      electionId,
      candidateId,
      userId,
      ipAddress,
      userAgent,
      isVerified: 1
    };

    return await DatabaseUtils.create('Vote', voteData);
  }

  static async getVotingDetails(voteId) {
    const vote = await DatabaseUtils.findOne('Vote', { voteId });
    if (!vote) return null;

    const user = await DatabaseUtils.findOne('User', { userId: vote.userId });
    const candidate = await DatabaseUtils.findOne('Candidate', { candidateId: vote.candidateId });
    const election = await DatabaseUtils.findOne('Election', { electionId: vote.electionId });

    return {
      vote: {
        voteId: vote.voteId,
        votedAt: vote.votedAt,
        ipAddress: vote.ipAddress,
        userAgent: vote.userAgent,
        isVerified: vote.isVerified
      },
      voter: {
        userId: user.userId,
        fullname: user.fullname,
        vin: user.vin,
        email: user.email
      },
      candidate: {
        candidateId: candidate.candidateId,
        name: candidate.name,
        party: candidate.party
      },
      election: {
        electionId: election.electionId,
        title: election.title,
        type: election.type
      }
    };
  }

  static async getElectionVotesWithDetails(electionId) {
    const votes = await DatabaseUtils.findMany('Vote', { electionId }, '*', 'votedAt DESC');
    
    return await Promise.all(
      votes.map(async (vote) => {
        const user = await DatabaseUtils.findOne('User', { userId: vote.userId });
        const candidate = await DatabaseUtils.findOne('Candidate', { candidateId: vote.candidateId });

        return {
          voteId: vote.voteId,
          votedAt: vote.votedAt,
          ipAddress: vote.ipAddress,
          isVerified: vote.isVerified,
          voter: {
            userId: user.userId,
            fullname: user.fullname,
            vin: user.vin
          },
          candidate: {
            candidateId: candidate.candidateId,
            name: candidate.name,
            party: candidate.party
          }
        };
      })
    );
  }

  static async getVotingTimeline(electionId) {
    return await DatabaseUtils.executeQuery(`
      SELECT 
        DATE(votedAt) as date,
        HOUR(votedAt) as hour,
        COUNT(*) as voteCount
      FROM Votes 
      WHERE electionId = ?
      GROUP BY DATE(votedAt), HOUR(votedAt)
      ORDER BY date, hour
    `, [electionId]);
  }

  static async getVotesByHour(electionId) {
    return await DatabaseUtils.executeQuery(`
      SELECT 
        HOUR(votedAt) as hour,
        COUNT(*) as voteCount
      FROM Votes 
      WHERE electionId = ?
      GROUP BY HOUR(votedAt)
      ORDER BY hour
    `, [electionId]);
  }

  static async getVerifiedVotes(electionId) {
    return await DatabaseUtils.count('Vote', { electionId, isVerified: 1 });
  }

  static async getUnverifiedVotes(electionId) {
    return await DatabaseUtils.count('Vote', { electionId, isVerified: 0 });
  }

  static async verifyVote(voteId) {
    return await DatabaseUtils.update('Vote', { isVerified: 1 }, { voteId });
  }

  static async unverifyVote(voteId) {
    return await DatabaseUtils.update('Vote', { isVerified: 0 }, { voteId });
  }

  static async getVoterTurnout(electionId) {
    const totalVotes = await this.countByElection(electionId);
    const totalVoters = await DatabaseUtils.count('User', { isActive: 1 });
    
    return {
      totalVotes,
      totalVoters,
      turnoutPercentage: totalVoters > 0 
        ? ((totalVotes / totalVoters) * 100).toFixed(2)
        : '0.00'
    };
  }
}

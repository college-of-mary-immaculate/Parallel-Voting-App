import { DatabaseUtils } from '../utils/database.js';

export class Candidate {
  static async findById(candidateId) {
    return await DatabaseUtils.findOne('Candidate', { candidateId });
  }

  static async create(candidateData) {
    return await DatabaseUtils.create('Candidate', candidateData);
  }

  static async update(candidateId, updates) {
    return await DatabaseUtils.update('Candidate', updates, { candidateId });
  }

  static async delete(candidateId) {
    return await DatabaseUtils.delete('Candidate', { candidateId });
  }

  static async findAll(conditions = {}) {
    return await DatabaseUtils.findMany('Candidate', conditions);
  }

  static async findByElection(electionId, activeOnly = true) {
    const conditions = { electionId };
    if (activeOnly) conditions.isActive = 1;
    
    return await DatabaseUtils.findMany('Candidate', conditions, '*', 'voteCount DESC');
  }

  static async count(conditions = {}) {
    return await DatabaseUtils.count('Candidate', conditions);
  }

  static async getActiveCandidates(electionId) {
    return await DatabaseUtils.findMany('Candidate', { electionId, isActive: 1 }, '*', 'voteCount DESC');
  }

  static async updateVoteCount(candidateId, increment = 1) {
    const candidate = await DatabaseUtils.findOne('Candidate', { candidateId });
    if (candidate) {
      const newCount = (candidate.voteCount || 0) + increment;
      return await DatabaseUtils.update('Candidate', { voteCount: newCount }, { candidateId });
    }
    return false;
  }

  static async activate(candidateId) {
    return await DatabaseUtils.update('Candidate', { isActive: 1 }, { candidateId });
  }

  static async deactivate(candidateId) {
    return await DatabaseUtils.update('Candidate', { isActive: 0 }, { candidateId });
  }

  static async toggleStatus(candidateId) {
    const candidate = await DatabaseUtils.findOne('Candidate', { candidateId });
    if (candidate) {
      const newStatus = candidate.isActive ? 0 : 1;
      return await DatabaseUtils.update('Candidate', { isActive: newStatus }, { candidateId });
    }
    return false;
  }

  static async checkIfExists(electionId, name) {
    return await DatabaseUtils.findOne('Candidate', { electionId, name });
  }

  static async getStatistics(candidateId) {
    const candidate = await DatabaseUtils.findOne('Candidate', { candidateId });
    if (!candidate) return null;

    const election = await DatabaseUtils.findOne('Election', { electionId: candidate.electionId });
    const allCandidates = await DatabaseUtils.findMany('Candidate', { 
      electionId: candidate.electionId, 
      isActive: 1 
    }, '*', 'voteCount DESC');

    const rank = allCandidates.findIndex(c => c.candidateId == candidateId) + 1;
    const totalVotes = candidate.voteCount || 0;
    const totalElectionVotes = election?.totalVotesCast || 0;
    const votePercentage = totalElectionVotes > 0 
      ? ((totalVotes / totalElectionVotes) * 100).toFixed(2)
      : '0.00';

    return {
      candidate: {
        candidateId: candidate.candidateId,
        name: candidate.name,
        party: candidate.party,
        description: candidate.description
      },
      statistics: {
        totalVotes,
        votePercentage: `${votePercentage}%`,
        rank,
        totalCandidates: allCandidates.length
      },
      election: {
        title: election?.title,
        status: election?.status,
        totalVotesCast: totalElectionVotes
      }
    };
  }

  static async getTopCandidates(electionId, limit = 5) {
    return await DatabaseUtils.findMany(
      'Candidate',
      { electionId, isActive: 1 },
      '*',
      'voteCount DESC',
      limit
    );
  }

  static async getCandidatesByParty(electionId) {
    const candidates = await DatabaseUtils.findMany('Candidate', { electionId, isActive: 1 });
    
    const partyGroups = candidates.reduce((groups, candidate) => {
      const party = candidate.party || 'Independent';
      if (!groups[party]) {
        groups[party] = {
          party,
          candidates: [],
          totalVotes: 0
        };
      }
      groups[party].candidates.push(candidate);
      groups[party].totalVotes += candidate.voteCount || 0;
      return groups;
    }, {});

    return Object.values(partyGroups).sort((a, b) => b.totalVotes - a.totalVotes);
  }
}

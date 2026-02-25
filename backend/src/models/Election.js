import { DatabaseUtils } from '../utils/database.js';

export class Election {
  static async findById(electionId) {
    return await DatabaseUtils.findOne('Election', { electionId });
  }

  static async create(electionData) {
    return await DatabaseUtils.create('Election', electionData);
  }

  static async update(electionId, updates) {
    return await DatabaseUtils.update('Election', updates, { electionId });
  }

  static async delete(electionId) {
    return await DatabaseUtils.delete('Election', { electionId });
  }

  static async findAll(conditions = {}) {
    return await DatabaseUtils.findMany('Election', conditions);
  }

  static async getActiveElections() {
    return await DatabaseUtils.findMany('Election', { status: 'active' }, '*', 'startTime ASC');
  }

  static async getUpcomingElections() {
    return await DatabaseUtils.findMany('Election', { status: 'upcoming' }, '*', 'startTime ASC');
  }

  static async getEndedElections() {
    return await DatabaseUtils.findMany('Election', { status: 'ended' }, '*', 'endTime DESC');
  }

  static async count(conditions = {}) {
    return await DatabaseUtils.count('Election', conditions);
  }

  static async getCandidates(electionId) {
    return await DatabaseUtils.findMany('Candidate', { electionId, isActive: 1 }, '*', 'voteCount DESC');
  }

  static async getTotalVotes(electionId) {
    const election = await DatabaseUtils.findOne('Election', { electionId });
    return election?.totalVotesCast || 0;
  }

  static async updateVoteCount(electionId, increment = 1) {
    const election = await DatabaseUtils.findOne('Election', { electionId });
    if (election) {
      const newTotal = (election.totalVotesCast || 0) + increment;
      return await DatabaseUtils.update('Election', { totalVotesCast: newTotal }, { electionId });
    }
    return false;
  }

  static async updateStatus(electionId, status) {
    return await DatabaseUtils.update('Election', { status }, { electionId });
  }

  static async checkIfVotingPeriod(electionId) {
    const election = await DatabaseUtils.findOne('Election', { electionId });
    if (!election) return false;

    const now = new Date();
    const startTime = new Date(election.startTime);
    const endTime = new Date(election.endTime);

    return election.status === 'active' && now >= startTime && now <= endTime;
  }

  static async getElectionResults(electionId) {
    const election = await DatabaseUtils.findOne('Election', { electionId });
    if (!election) return null;

    // Only show results if election is ended or real-time results are enabled
    if (election.status !== 'ended' && !election.showRealTimeResults) {
      return null;
    }

    const candidates = await DatabaseUtils.findMany(
      'Candidate',
      { electionId, isActive: 1 },
      '*',
      'voteCount DESC'
    );

    const totalVotes = election.totalVotesCast || 0;
    const results = candidates.map(candidate => ({
      ...candidate,
      votePercentage: totalVotes > 0 
        ? ((candidate.voteCount / totalVotes) * 100).toFixed(2)
        : '0.00'
    }));

    return {
      election: {
        title: election.title,
        status: election.status,
        totalVotesCast: totalVotes,
        totalVoters: election.totalVoters
      },
      candidates: results
    };
  }

  static async getStatistics(electionId) {
    const election = await DatabaseUtils.findOne('Election', { electionId });
    if (!election) return null;

    const candidates = await DatabaseUtils.findMany('Candidate', { electionId, isActive: 1 });
    const votes = await DatabaseUtils.findMany('Votes', { electionId });

    return {
      election: {
        title: election.title,
        status: election.status,
        startTime: election.startTime,
        endTime: election.endTime
      },
      statistics: {
        totalCandidates: candidates.length,
        totalVotesCast: election.totalVotesCast || 0,
        totalVoters: election.totalVoters || 0,
        turnoutPercentage: election.totalVoters > 0 
          ? ((election.totalVotesCast / election.totalVoters) * 100).toFixed(2)
          : '0.00'
      },
      candidates: candidates.map(candidate => ({
        candidateId: candidate.candidateId,
        name: candidate.name,
        party: candidate.party,
        voteCount: candidate.voteCount || 0
      }))
    };
  }
}

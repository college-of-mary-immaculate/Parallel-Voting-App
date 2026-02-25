import { DatabaseUtils } from '../utils/database.js';

export class VoteController {
  // Cast a vote
  static async castVote(req, res) {
    try {
      const userId = req.user.userId;
      const { electionId, candidateId } = req.body;

      // Validate required fields
      if (!electionId || !candidateId) {
        return res.status(400).json({
          success: false,
          message: 'Election ID and candidate ID are required'
        });
      }

      // Check if election exists and is active
      const election = await DatabaseUtils.findOne('Election', { electionId });
      
      if (!election) {
        return res.status(404).json({
          success: false,
          message: 'Election not found'
        });
      }

      if (election.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Election is not active for voting'
        });
      }

      // Check if election period is valid
      const now = new Date();
      const startTime = new Date(election.startTime);
      const endTime = new Date(election.endTime);

      if (now < startTime) {
        return res.status(400).json({
          success: false,
          message: 'Voting has not started yet'
        });
      }

      if (now > endTime) {
        return res.status(400).json({
          success: false,
          message: 'Voting has ended'
        });
      }

      // Check if candidate exists and is active
      const candidate = await DatabaseUtils.findOne('Candidate', { 
        candidateId, 
        electionId, 
        isActive: 1 
      });
      
      if (!candidate) {
        return res.status(404).json({
          success: false,
          message: 'Candidate not found or not active'
        });
      }

      // Check if user has already voted in this election
      const existingVote = await DatabaseUtils.findOne('Votes', { 
        userId, 
        electionId 
      });

      if (existingVote) {
        return res.status(400).json({
          success: false,
          message: 'You have already voted in this election'
        });
      }

      // Get client IP and user agent for audit
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Create vote record
      const voteData = {
        electionId,
        candidateId,
        userId,
        ipAddress,
        userAgent,
        isVerified: 1
      };

      const voteId = await DatabaseUtils.create('Votes', voteData);

      res.status(201).json({
        success: true,
        message: 'Vote cast successfully',
        data: {
          voteId,
          electionId,
          candidateId,
          votedAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to cast vote',
        error: error.message
      });
    }
  }

  // Check if user has voted in an election
  static async checkVoteStatus(req, res) {
    try {
      const userId = req.user.userId;
      const { electionId } = req.params;

      // Check if election exists
      const election = await DatabaseUtils.findOne('Election', { electionId });
      
      if (!election) {
        return res.status(404).json({
          success: false,
          message: 'Election not found'
        });
      }

      // Check if user has voted
      const vote = await DatabaseUtils.findOne('Votes', { userId, electionId });

      res.json({
        success: true,
        data: {
          hasVoted: !!vote,
          electionId,
          voteDetails: vote ? {
            voteId: vote.voteId,
            votedAt: vote.votedAt
          } : null
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to check vote status',
        error: error.message
      });
    }
  }

  // Get all votes for an election (admin only)
  static async getElectionVotes(req, res) {
    try {
      const { electionId } = req.params;

      // Check if election exists
      const election = await DatabaseUtils.findOne('Election', { electionId });
      
      if (!election) {
        return res.status(404).json({
          success: false,
          message: 'Election not found'
        });
      }

      // Get all votes for the election
      const votes = await DatabaseUtils.findMany('Votes', { electionId }, '*', 'votedAt DESC');

      // Get user and candidate details for each vote
      const voteDetails = await Promise.all(
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

      res.json({
        success: true,
        data: {
          election: {
            id: election.electionId,
            title: election.title,
            totalVotesCast: election.totalVotesCast
          },
          votes: voteDetails,
          count: voteDetails.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch election votes',
        error: error.message
      });
    }
  }

  // Get voting statistics for an election
  static async getVotingStats(req, res) {
    try {
      const { electionId } = req.params;

      // Check if election exists
      const election = await DatabaseUtils.findOne('Election', { electionId });
      
      if (!election) {
        return res.status(404).json({
          success: false,
          message: 'Election not found'
        });
      }

      // Get total registered voters (this would need to be tracked separately)
      // For now, we'll use a placeholder or count from User table
      const totalVoters = await DatabaseUtils.count('User', { isActive: 1 });

      // Get votes by candidate
      const candidates = await DatabaseUtils.findMany(
        'Candidate',
        { electionId, isActive: 1 },
        '*',
        'voteCount DESC'
      );

      // Calculate statistics
      const totalVotesCast = election.totalVotesCast || 0;
      const turnoutPercentage = totalVoters > 0 
        ? ((totalVotesCast / totalVoters) * 100).toFixed(2)
        : '0.00';

      const candidateStats = candidates.map(candidate => ({
        candidateId: candidate.candidateId,
        name: candidate.name,
        party: candidate.party,
        voteCount: candidate.voteCount || 0,
        votePercentage: totalVotesCast > 0 
          ? ((candidate.voteCount / totalVotesCast) * 100).toFixed(2)
          : '0.00'
      }));

      // Get voting timeline (votes per hour)
      const votesByHour = await DatabaseUtils.executeQuery(`
        SELECT 
          HOUR(votedAt) as hour,
          COUNT(*) as voteCount
        FROM Votes 
        WHERE electionId = ?
        GROUP BY HOUR(votedAt)
        ORDER BY hour
      `, [electionId]);

      res.json({
        success: true,
        data: {
          election: {
            id: election.electionId,
            title: election.title,
            status: election.status,
            startTime: election.startTime,
            endTime: election.endTime
          },
          overview: {
            totalVoters,
            totalVotesCast,
            turnoutPercentage: `${turnoutPercentage}%`,
            candidatesCount: candidates.length
          },
          candidates: candidateStats,
          timeline: votesByHour
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch voting statistics',
        error: error.message
      });
    }
  }

  // Verify a vote (admin only)
  static async verifyVote(req, res) {
    try {
      const { voteId } = req.params;
      const { isVerified } = req.body;

      // Check if vote exists
      const existingVote = await DatabaseUtils.findOne('Votes', { voteId });
      
      if (!existingVote) {
        return res.status(404).json({
          success: false,
          message: 'Vote not found'
        });
      }

      const updated = await DatabaseUtils.update('Votes', 
        { isVerified: isVerified ? 1 : 0 }, 
        { voteId }
      );

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to verify vote'
        });
      }

      res.json({
        success: true,
        message: `Vote ${isVerified ? 'verified' : 'unverified'} successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to verify vote',
        error: error.message
      });
    }
  }

  // Delete a vote (admin only)
  static async deleteVote(req, res) {
    try {
      const { voteId } = req.params;

      // Check if vote exists
      const existingVote = await DatabaseUtils.findOne('Votes', { voteId });
      
      if (!existingVote) {
        return res.status(404).json({
          success: false,
          message: 'Vote not found'
        });
      }

      const deleted = await DatabaseUtils.delete('Votes', { voteId });

      if (!deleted) {
        return res.status(400).json({
          success: false,
          message: 'Failed to delete vote'
        });
      }

      res.json({
        success: true,
        message: 'Vote deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete vote',
        error: error.message
      });
    }
  }

  // Get real-time voting results (if enabled)
  static async getRealTimeResults(req, res) {
    try {
      const { electionId } = req.params;

      // Check if election exists
      const election = await DatabaseUtils.findOne('Election', { electionId });
      
      if (!election) {
        return res.status(404).json({
          success: false,
          message: 'Election not found'
        });
      }

      // Only show real-time results if enabled
      if (!election.showRealTimeResults && election.status !== 'ended') {
        return res.status(403).json({
          success: false,
          message: 'Real-time results are not enabled for this election'
        });
      }

      // Get current results
      const candidates = await DatabaseUtils.findMany(
        'Candidate',
        { electionId, isActive: 1 },
        '*',
        'voteCount DESC'
      );

      const totalVotesCast = election.totalVotesCast || 0;
      const results = candidates.map(candidate => ({
        candidateId: candidate.candidateId,
        name: candidate.name,
        party: candidate.party,
        voteCount: candidate.voteCount || 0,
        votePercentage: totalVotesCast > 0 
          ? ((candidate.voteCount / totalVotesCast) * 100).toFixed(2)
          : '0.00',
        rank: candidates.findIndex(c => c.candidateId === candidate.candidateId) + 1
      }));

      res.json({
        success: true,
        data: {
          election: {
            id: election.electionId,
            title: election.title,
            status: election.status,
            totalVotesCast,
            showRealTimeResults: election.showRealTimeResults
          },
          candidates: results,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch real-time results',
        error: error.message
      });
    }
  }
}

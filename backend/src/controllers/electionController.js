import { DatabaseUtils } from '../utils/database.js';

export class ElectionController {
  // Get all elections
  static async getAllElections(req, res) {
    try {
      const elections = await DatabaseUtils.findMany('Election', {}, '*', 'startTime DESC');
      res.json({
        success: true,
        data: elections,
        count: elections.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch elections',
        error: error.message
      });
    }
  }

  // Get election by ID
  static async getElectionById(req, res) {
    try {
      const { id } = req.params;
      const election = await DatabaseUtils.findOne('Election', { electionId: id });
      
      if (!election) {
        return res.status(404).json({
          success: false,
          message: 'Election not found'
        });
      }

      res.json({
        success: true,
        data: election
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch election',
        error: error.message
      });
    }
  }

  // Create new election
  static async createElection(req, res) {
    try {
      const {
        title,
        description,
        type = 'general',
        startTime,
        endTime,
        maxVotesPerVoter = 1,
        allowCandidateRegistration = false,
        showRealTimeResults = true
      } = req.body;

      // Validate required fields
      if (!title || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'Title, start time, and end time are required'
        });
      }

      // Validate dates
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }

      const electionData = {
        title,
        description,
        type,
        startTime,
        endTime,
        maxVotesPerVoter,
        allowCandidateRegistration,
        showRealTimeResults,
        status: new Date() < start ? 'upcoming' : 'active'
      };

      const electionId = await DatabaseUtils.create('Election', electionData);

      res.status(201).json({
        success: true,
        message: 'Election created successfully',
        data: { electionId, ...electionData }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create election',
        error: error.message
      });
    }
  }

  // Update election
  static async updateElection(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Check if election exists
      const existingElection = await DatabaseUtils.findOne('Election', { electionId: id });
      
      if (!existingElection) {
        return res.status(404).json({
          success: false,
          message: 'Election not found'
        });
      }

      // Don't allow updating if election is active or ended
      if (existingElection.status === 'active' || existingElection.status === 'ended') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update election that is active or ended'
        });
      }

      const updated = await DatabaseUtils.update('Election', updates, { electionId: id });

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update election'
        });
      }

      res.json({
        success: true,
        message: 'Election updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update election',
        error: error.message
      });
    }
  }

  // Delete election
  static async deleteElection(req, res) {
    try {
      const { id } = req.params;

      // Check if election exists
      const existingElection = await DatabaseUtils.findOne('Election', { electionId: id });
      
      if (!existingElection) {
        return res.status(404).json({
          success: false,
          message: 'Election not found'
        });
      }

      // Don't allow deleting if election is active or ended
      if (existingElection.status === 'active' || existingElection.status === 'ended') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete election that is active or ended'
        });
      }

      const deleted = await DatabaseUtils.delete('Election', { electionId: id });

      if (!deleted) {
        return res.status(400).json({
          success: false,
          message: 'Failed to delete election'
        });
      }

      res.json({
        success: true,
        message: 'Election deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete election',
        error: error.message
      });
    }
  }

  // Get active elections
  static async getActiveElections(req, res) {
    try {
      const elections = await DatabaseUtils.findMany(
        'Election', 
        { status: 'active' }, 
        '*', 
        'startTime ASC'
      );
      
      res.json({
        success: true,
        data: elections,
        count: elections.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active elections',
        error: error.message
      });
    }
  }

  // Get upcoming elections
  static async getUpcomingElections(req, res) {
    try {
      const elections = await DatabaseUtils.findMany(
        'Election', 
        { status: 'upcoming' }, 
        '*', 
        'startTime ASC'
      );
      
      res.json({
        success: true,
        data: elections,
        count: elections.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch upcoming elections',
        error: error.message
      });
    }
  }

  // Get election results
  static async getElectionResults(req, res) {
    try {
      const { id } = req.params;

      // Check if election exists
      const election = await DatabaseUtils.findOne('Election', { electionId: id });
      
      if (!election) {
        return res.status(404).json({
          success: false,
          message: 'Election not found'
        });
      }

      // Only show results if election is ended or if real-time results are enabled
      if (election.status !== 'ended' && !election.showRealTimeResults) {
        return res.status(403).json({
          success: false,
          message: 'Results are not available yet'
        });
      }

      // Get candidates with vote counts
      const candidates = await DatabaseUtils.findMany(
        'Candidate',
        { electionId: id, isActive: 1 },
        '*',
        'voteCount DESC'
      );

      // Calculate percentages
      const results = candidates.map(candidate => ({
        ...candidate,
        votePercentage: election.totalVotesCast > 0 
          ? ((candidate.voteCount / election.totalVotesCast) * 100).toFixed(2)
          : '0.00'
      }));

      res.json({
        success: true,
        data: {
          election: {
            title: election.title,
            status: election.status,
            totalVotesCast: election.totalVotesCast,
            totalVoters: election.totalVoters
          },
          candidates: results
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch election results',
        error: error.message
      });
    }
  }
}

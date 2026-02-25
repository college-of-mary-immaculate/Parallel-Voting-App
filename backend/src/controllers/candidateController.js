const { DatabaseUtils } = require('../utils/database.js');

module.exports = class CandidateController {
  // Get all candidates
  static async getAllCandidates(req, res) {
    try {
      const { electionId } = req.query;
      const conditions = electionId ? { electionId } : {};
      
      const candidates = await DatabaseUtils.findMany(
        'Candidate', 
        conditions, 
        '*', 
        'voteCount DESC'
      );
      
      res.json({
        success: true,
        data: candidates,
        count: candidates.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch candidates',
        error: error.message
      });
    }
  }

  // Get candidate by ID
  static async getCandidateById(req, res) {
    try {
      const { id } = req.params;
      const candidate = await DatabaseUtils.findOne('Candidate', { candidateId: id });
      
      if (!candidate) {
        return res.status(404).json({
          success: false,
          message: 'Candidate not found'
        });
      }

      res.json({
        success: true,
        data: candidate
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch candidate',
        error: error.message
      });
    }
  }

  // Get candidates by election
  static async getCandidatesByElection(req, res) {
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

      const candidates = await DatabaseUtils.findMany(
        'Candidate', 
        { electionId, isActive: 1 }, 
        '*', 
        'voteCount DESC'
      );
      
      res.json({
        success: true,
        data: candidates,
        count: candidates.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch candidates',
        error: error.message
      });
    }
  }

  // Create new candidate
  static async createCandidate(req, res) {
    try {
      const {
        electionId,
        name,
        description,
        party,
        platform,
        photoUrl
      } = req.body;

      // Validate required fields
      if (!electionId || !name) {
        return res.status(400).json({
          success: false,
          message: 'Election ID and name are required'
        });
      }

      // Check if election exists and allows candidate registration
      const election = await DatabaseUtils.findOne('Election', { electionId });
      
      if (!election) {
        return res.status(404).json({
          success: false,
          message: 'Election not found'
        });
      }

      if (!election.allowCandidateRegistration && election.status !== 'upcoming') {
        return res.status(400).json({
          success: false,
          message: 'Candidate registration is not allowed for this election'
        });
      }

      // Check if candidate already exists for this election
      const existingCandidate = await DatabaseUtils.findOne('Candidate', {
        electionId,
        name
      });

      if (existingCandidate) {
        return res.status(400).json({
          success: false,
          message: 'Candidate with this name already exists for this election'
        });
      }

      const candidateData = {
        electionId,
        name,
        description,
        party,
        platform,
        photoUrl,
        voteCount: 0,
        isActive: 1
      };

      const candidateId = await DatabaseUtils.create('Candidate', candidateData);

      res.status(201).json({
        success: true,
        message: 'Candidate created successfully',
        data: { candidateId, ...candidateData }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create candidate',
        error: error.message
      });
    }
  }

  // Update candidate
  static async updateCandidate(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Check if candidate exists
      const existingCandidate = await DatabaseUtils.findOne('Candidate', { candidateId: id });
      
      if (!existingCandidate) {
        return res.status(404).json({
          success: false,
          message: 'Candidate not found'
        });
      }

      // Check if election is still upcoming
      const election = await DatabaseUtils.findOne('Election', { 
        electionId: existingCandidate.electionId 
      });

      if (election.status !== 'upcoming') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update candidate when election is active or ended'
        });
      }

      // Don't allow updating vote count directly
      delete updates.voteCount;

      const updated = await DatabaseUtils.update('Candidate', updates, { candidateId: id });

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update candidate'
        });
      }

      res.json({
        success: true,
        message: 'Candidate updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update candidate',
        error: error.message
      });
    }
  }

  // Delete candidate
  static async deleteCandidate(req, res) {
    try {
      const { id } = req.params;

      // Check if candidate exists
      const existingCandidate = await DatabaseUtils.findOne('Candidate', { candidateId: id });
      
      if (!existingCandidate) {
        return res.status(404).json({
          success: false,
          message: 'Candidate not found'
        });
      }

      // Check if election is still upcoming
      const election = await DatabaseUtils.findOne('Election', { 
        electionId: existingCandidate.electionId 
      });

      if (election.status !== 'upcoming') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete candidate when election is active or ended'
        });
      }

      const deleted = await DatabaseUtils.delete('Candidate', { candidateId: id });

      if (!deleted) {
        return res.status(400).json({
          success: false,
          message: 'Failed to delete candidate'
        });
      }

      res.json({
        success: true,
        message: 'Candidate deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete candidate',
        error: error.message
      });
    }
  }

  // Activate/deactivate candidate
  static async toggleCandidateStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      // Check if candidate exists
      const existingCandidate = await DatabaseUtils.findOne('Candidate', { candidateId: id });
      
      if (!existingCandidate) {
        return res.status(404).json({
          success: false,
          message: 'Candidate not found'
        });
      }

      // Check if election is still upcoming
      const election = await DatabaseUtils.findOne('Election', { 
        electionId: existingCandidate.electionId 
      });

      if (election.status !== 'upcoming') {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify candidate when election is active or ended'
        });
      }

      const updated = await DatabaseUtils.update('Candidate', 
        { isActive: isActive ? 1 : 0 }, 
        { candidateId: id }
      );

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update candidate status'
        });
      }

      res.json({
        success: true,
        message: `Candidate ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update candidate status',
        error: error.message
      });
    }
  }

  // Get candidate statistics
  static async getCandidateStats(req, res) {
    try {
      const { id } = req.params;

      // Get candidate details
      const candidate = await DatabaseUtils.findOne('Candidate', { candidateId: id });
      
      if (!candidate) {
        return res.status(404).json({
          success: false,
          message: 'Candidate not found'
        });
      }

      // Get election details
      const election = await DatabaseUtils.findOne('Election', { 
        electionId: candidate.electionId 
      });

      // Calculate statistics
      const totalVotes = candidate.voteCount || 0;
      const totalElectionVotes = election?.totalVotesCast || 0;
      const votePercentage = totalElectionVotes > 0 
        ? ((totalVotes / totalElectionVotes) * 100).toFixed(2)
        : '0.00';

      // Get rank among candidates
      const allCandidates = await DatabaseUtils.findMany(
        'Candidate',
        { electionId: candidate.electionId, isActive: 1 },
        '*',
        'voteCount DESC'
      );

      const rank = allCandidates.findIndex(c => c.candidateId == id) + 1;

      res.json({
        success: true,
        data: {
          candidate: {
            name: candidate.name,
            party: candidate.party
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
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch candidate statistics',
        error: error.message
      });
    }
  }
}

module.exports = CandidateController;

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { DatabaseUtils } from '../utils/database.js';

export class UserController {
  // Generate JWT token
  static generateToken(userId, email, role) {
    return jwt.sign(
      { userId, email, role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  // Register new user
  static async register(req, res) {
    try {
      const { vin, fullname, email, password } = req.body;

      // Validate required fields
      if (!vin || !fullname || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      // Check if user already exists
      const existingUser = await DatabaseUtils.findOne('User', { email });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      const existingVin = await DatabaseUtils.findOne('User', { vin });
      
      if (existingVin) {
        return res.status(400).json({
          success: false,
          message: 'User with this VIN already exists'
        });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const userData = {
        vin,
        fullname,
        email,
        password: hashedPassword,
        role: 'voter',
        isActive: 1,
        emailVerified: 0
      };

      const userId = await DatabaseUtils.create('User', userData);

      // Generate token
      const token = this.generateToken(userId, email, 'voter');

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          userId,
          vin,
          fullname,
          email,
          role: 'voter',
          token
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to register user',
        error: error.message
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user
      const user = await DatabaseUtils.findOne('User', { email });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate token
      const token = this.generateToken(user.userId, user.email, user.role);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          userId: user.userId,
          vin: user.vin,
          fullname: user.fullname,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          token
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to login',
        error: error.message
      });
    }
  }

  // Get user profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      
      const user = await DatabaseUtils.findOne('User', { userId });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
        error: error.message
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { fullname, email } = req.body;

      // Check if email is being changed and if it's already taken
      if (email && email !== req.user.email) {
        const existingUser = await DatabaseUtils.findOne('User', { email });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email is already taken'
          });
        }
      }

      const updates = {};
      if (fullname) updates.fullname = fullname;
      if (email) updates.email = email;

      const updated = await DatabaseUtils.update('User', updates, { userId });

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update profile'
        });
      }

      // Get updated user data
      const updatedUser = await DatabaseUtils.findOne('User', { userId });
      const { password, ...userWithoutPassword } = updatedUser;

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: userWithoutPassword
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      // Validate required fields
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      // Get user
      const user = await DatabaseUtils.findOne('User', { userId });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      const updated = await DatabaseUtils.update('User', 
        { password: hashedNewPassword }, 
        { userId }
      );

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to change password'
        });
      }

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }

  // Get all users (admin only)
  static async getAllUsers(req, res) {
    try {
      const { role, isActive } = req.query;
      const conditions = {};
      
      if (role) conditions.role = role;
      if (isActive !== undefined) conditions.isActive = isActive ? 1 : 0;

      const users = await DatabaseUtils.findMany('User', conditions, '*', 'createdAt DESC');
      
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json({
        success: true,
        data: usersWithoutPasswords,
        count: usersWithoutPasswords.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  }

  // Update user status (admin only)
  static async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      // Check if user exists
      const existingUser = await DatabaseUtils.findOne('User', { userId: id });
      
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Don't allow deactivating yourself
      if (id == req.user.userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account'
        });
      }

      const updated = await DatabaseUtils.update('User', 
        { isActive: isActive ? 1 : 0 }, 
        { userId: id }
      );

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update user status'
        });
      }

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: error.message
      });
    }
  }

  // Get user voting history
  static async getVotingHistory(req, res) {
    try {
      const userId = req.user.userId;

      const votes = await DatabaseUtils.findMany(
        'Votes',
        { userId },
        '*',
        'votedAt DESC'
      );

      // Get election and candidate details for each vote
      const votingHistory = await Promise.all(
        votes.map(async (vote) => {
          const election = await DatabaseUtils.findOne('Election', { electionId: vote.electionId });
          const candidate = await DatabaseUtils.findOne('Candidate', { candidateId: vote.candidateId });

          return {
            voteId: vote.voteId,
            votedAt: vote.votedAt,
            election: {
              id: election.electionId,
              title: election.title,
              type: election.type
            },
            candidate: {
              id: candidate.candidateId,
              name: candidate.name,
              party: candidate.party
            }
          };
        })
      );

      res.json({
        success: true,
        data: votingHistory,
        count: votingHistory.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch voting history',
        error: error.message
      });
    }
  }
}

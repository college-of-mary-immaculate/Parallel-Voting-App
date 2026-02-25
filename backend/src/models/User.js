import { DatabaseUtils } from '../utils/database.js';

export class User {
  static async findById(userId) {
    return await DatabaseUtils.findOne('User', { userId });
  }

  static async findByEmail(email) {
    return await DatabaseUtils.findOne('User', { email });
  }

  static async findByVin(vin) {
    return await DatabaseUtils.findOne('User', { vin });
  }

  static async create(userData) {
    return await DatabaseUtils.create('User', userData);
  }

  static async update(userId, updates) {
    return await DatabaseUtils.update('User', updates, { userId });
  }

  static async delete(userId) {
    return await DatabaseUtils.delete('User', { userId });
  }

  static async findAll(conditions = {}) {
    const users = await DatabaseUtils.findMany('User', conditions);
    // Remove passwords from results
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  static async count(conditions = {}) {
    return await DatabaseUtils.count('User', conditions);
  }

  static async getVoters() {
    return await DatabaseUtils.findMany('User', { role: 'voter', isActive: 1 });
  }

  static async getAdmins() {
    return await DatabaseUtils.findMany('User', { role: 'admin', isActive: 1 });
  }

  static async hasVotedInElection(userId, electionId) {
    const vote = await DatabaseUtils.findOne('Votes', { userId, electionId });
    return !!vote;
  }

  static async getVotingHistory(userId) {
    return await DatabaseUtils.findMany('Votes', { userId }, '*', 'votedAt DESC');
  }

  static async updateEmailVerification(userId, isVerified) {
    return await DatabaseUtils.update('User', { emailVerified: isVerified ? 1 : 0 }, { userId });
  }

  static async activateUser(userId) {
    return await DatabaseUtils.update('User', { isActive: 1 }, { userId });
  }

  static async deactivateUser(userId) {
    return await DatabaseUtils.update('User', { isActive: 0 }, { userId });
  }
}

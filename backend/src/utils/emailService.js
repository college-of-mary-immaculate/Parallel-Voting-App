const nodemailer = require('nodemailer');
const { query } = require('../config/mockDatabase');

/**
 * Email Notification Service
 * Handles email notifications for vote confirmations, election announcements, and system alerts
 */

// Email transporter configuration
let transporter = null;

/**
 * Initialize email service
 */
const initializeEmailService = async () => {
  try {
    const config = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };

    // Create transporter
    transporter = nodemailer.createTransporter(config);

    // Verify connection
    await transporter.verify();
    
    console.log('✅ Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error.message);
    return false;
  }
};

/**
 * Send vote confirmation email
 */
const sendVoteConfirmation = async (userId, electionId, candidateId, voteId) => {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized');
    }

    // Get user, election, and candidate details
    const [user, election, candidate] = await Promise.all([
      query('SELECT email, firstName, lastName FROM User WHERE userId = ?', [userId]),
      query('SELECT title, description FROM Election WHERE electionId = ?', [electionId]),
      query('SELECT name, party FROM Candidate WHERE candidateId = ?', [candidateId])
    ]);

    if (user.length === 0 || election.length === 0 || candidate.length === 0) {
      throw new Error('Required information not found');
    }

    const userEmail = user[0].email;
    const userName = `${user[0].firstName} ${user[0].lastName}`;
    const electionTitle = election[0].title;
    const candidateName = candidate[0].name;
    const candidateParty = candidate[0].party;

    // Create email content
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Voting System'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Vote Confirmation - ${electionTitle}`,
      html: generateVoteConfirmationHTML({
        userName,
        electionTitle,
        candidateName,
        candidateParty,
        voteId,
        timestamp: new Date().toLocaleString()
      }),
      text: generateVoteConfirmationText({
        userName,
        electionTitle,
        candidateName,
        candidateParty,
        voteId,
        timestamp: new Date().toLocaleString()
      })
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);

    // Log the email
    await logEmailNotification({
      userId,
      electionId,
      candidateId,
      voteId,
      type: 'vote_confirmation',
      to: userEmail,
      subject: mailOptions.subject,
      status: 'sent',
      messageId: result.messageId
    });

    return {
      success: true,
      messageId: result.messageId,
      message: 'Vote confirmation email sent successfully'
    };
  } catch (error) {
    // Log failed email
    await logEmailNotification({
      userId,
      electionId,
      candidateId,
      voteId,
      type: 'vote_confirmation',
      to: userEmail || 'unknown',
      subject: 'Vote Confirmation',
      status: 'failed',
      error: error.message
    });

    throw new Error(`Failed to send vote confirmation: ${error.message}`);
  }
};

/**
 * Send election announcement email
 */
const sendElectionAnnouncement = async (electionId, announcementType = 'new') => {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized');
    }

    // Get election details
    const election = await query(
      'SELECT * FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (election.length === 0) {
      throw new Error('Election not found');
    }

    const electionData = election[0];

    // Get all eligible users
    const users = await query(
      'SELECT userId, email, firstName, lastName FROM User WHERE isActive = 1 AND role != "banned"',
      []
    );

    if (users.length === 0) {
      return { success: true, message: 'No eligible users found' };
    }

    // Prepare email content
    const subject = getElectionAnnouncementSubject(electionData, announcementType);
    const htmlContent = generateElectionAnnouncementHTML(electionData, announcementType);
    const textContent = generateElectionAnnouncementText(electionData, announcementType);

    // Send emails in batches to avoid overwhelming the server
    const batchSize = 50;
    const results = [];
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (user) => {
        try {
          const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'Voting System'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: user.email,
            subject,
            html: htmlContent.replace('{{userName}}', `${user.firstName} ${user.lastName}`),
            text: textContent.replace('{{userName}}', `${user.firstName} ${user.lastName}`)
          };

          const result = await transporter.sendMail(mailOptions);

          // Log successful email
          await logEmailNotification({
            userId: user.userId,
            electionId,
            type: 'election_announcement',
            to: user.email,
            subject,
            status: 'sent',
            messageId: result.messageId,
            announcementType
          });

          return { success: true, userId: user.userId, messageId: result.messageId };
        } catch (error) {
          // Log failed email
          await logEmailNotification({
            userId: user.userId,
            electionId,
            type: 'election_announcement',
            to: user.email,
            subject,
            status: 'failed',
            error: error.message,
            announcementType
          });

          return { success: false, userId: user.userId, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      success: true,
      message: `Election announcement sent to ${successful} users (${failed} failed)`,
      results: {
        total: users.length,
        successful,
        failed,
        details: results
      }
    };
  } catch (error) {
    throw new Error(`Failed to send election announcement: ${error.message}`);
  }
};

/**
 * Send election reminder email
 */
const sendElectionReminder = async (electionId, reminderType = 'start_soon') => {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized');
    }

    // Get election details
    const election = await query(
      'SELECT * FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (election.length === 0) {
      throw new Error('Election not found');
    }

    const electionData = election[0];

    // Get users who haven't voted in this election
    const users = await query(`
      SELECT u.userId, u.email, u.firstName, u.lastName
      FROM User u
      WHERE u.isActive = 1 
        AND u.role != 'banned'
        AND u.userId NOT IN (
          SELECT DISTINCT v.userId 
          FROM Vote v 
          WHERE v.electionId = ?
        )
    `, [electionId]);

    if (users.length === 0) {
      return { success: true, message: 'All eligible users have already voted' };
    }

    // Prepare email content
    const subject = getElectionReminderSubject(electionData, reminderType);
    const htmlContent = generateElectionReminderHTML(electionData, reminderType);
    const textContent = generateElectionReminderText(electionData, reminderType);

    // Send emails in batches
    const batchSize = 50;
    const results = [];
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (user) => {
        try {
          const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'Voting System'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: user.email,
            subject,
            html: htmlContent.replace('{{userName}}', `${user.firstName} ${user.lastName}`),
            text: textContent.replace('{{userName}}', `${user.firstName} ${user.lastName}`)
          };

          const result = await transporter.sendMail(mailOptions);

          // Log successful email
          await logEmailNotification({
            userId: user.userId,
            electionId,
            type: 'election_reminder',
            to: user.email,
            subject,
            status: 'sent',
            messageId: result.messageId,
            reminderType
          });

          return { success: true, userId: user.userId, messageId: result.messageId };
        } catch (error) {
          // Log failed email
          await logEmailNotification({
            userId: user.userId,
            electionId,
            type: 'election_reminder',
            to: user.email,
            subject,
            status: 'failed',
            error: error.message,
            reminderType
          });

          return { success: false, userId: user.userId, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      success: true,
      message: `Election reminder sent to ${successful} users (${failed} failed)`,
      results: {
        total: users.length,
        successful,
        failed,
        details: results
      }
    };
  } catch (error) {
    throw new Error(`Failed to send election reminder: ${error.message}`);
  }
};

/**
 * Send election results notification
 */
const sendElectionResults = async (electionId) => {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized');
    }

    // Get election details with results
    const [election, results] = await Promise.all([
      query('SELECT * FROM Election WHERE electionId = ?', [electionId]),
      query(`
        SELECT c.name, c.party, COUNT(v.voteId) as voteCount
        FROM Candidate c
        LEFT JOIN Vote v ON c.candidateId = v.candidateId
        WHERE c.electionId = ?
        GROUP BY c.candidateId
        ORDER BY voteCount DESC
      `, [electionId])
    ]);

    if (election.length === 0) {
      throw new Error('Election not found');
    }

    const electionData = election[0];

    // Get all users who participated in the election
    const users = await query(`
      SELECT DISTINCT u.userId, u.email, u.firstName, u.lastName
      FROM User u
      JOIN Vote v ON u.userId = v.userId
      WHERE v.electionId = ?
    `, [electionId]);

    if (users.length === 0) {
      return { success: true, message: 'No participants found' };
    }

    // Prepare email content
    const subject = `Election Results: ${electionData.title}`;
    const htmlContent = generateElectionResultsHTML(electionData, results);
    const textContent = generateElectionResultsText(electionData, results);

    // Send emails in batches
    const batchSize = 50;
    const results_array = [];
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (user) => {
        try {
          const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'Voting System'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: user.email,
            subject,
            html: htmlContent.replace('{{userName}}', `${user.firstName} ${user.lastName}`),
            text: textContent.replace('{{userName}}', `${user.firstName} ${user.lastName}`)
          };

          const result = await transporter.sendMail(mailOptions);

          // Log successful email
          await logEmailNotification({
            userId: user.userId,
            electionId,
            type: 'election_results',
            to: user.email,
            subject,
            status: 'sent',
            messageId: result.messageId
          });

          return { success: true, userId: user.userId, messageId: result.messageId };
        } catch (error) {
          // Log failed email
          await logEmailNotification({
            userId: user.userId,
            electionId,
            type: 'election_results',
            to: user.email,
            subject,
            status: 'failed',
            error: error.message
          });

          return { success: false, userId: user.userId, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results_array.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results_array.filter(r => r.success).length;
    const failed = results_array.filter(r => !r.success).length;

    return {
      success: true,
      message: `Election results sent to ${successful} users (${failed} failed)`,
      results: {
        total: users.length,
        successful,
        failed,
        details: results_array
      }
    };
  } catch (error) {
    throw new Error(`Failed to send election results: ${error.message}`);
  }
};

/**
 * Send admin notification
 */
const sendAdminNotification = async (subject, message, recipients = null) => {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized');
    }

    // Get admin users if recipients not specified
    const adminUsers = recipients || await query(
      'SELECT email, firstName, lastName FROM User WHERE role = "admin" AND isActive = 1',
      []
    );

    if (adminUsers.length === 0) {
      return { success: true, message: 'No admin users found' };
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Voting System'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: adminUsers.map(u => u.email).join(', '),
      subject: `[Admin Alert] ${subject}`,
      html: generateAdminNotificationHTML(subject, message),
      text: generateAdminNotificationText(subject, message)
    };

    const result = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: result.messageId,
      message: 'Admin notification sent successfully'
    };
  } catch (error) {
    throw new Error(`Failed to send admin notification: ${error.message}`);
  }
};

/**
 * Log email notification
 */
const logEmailNotification = async (notificationData) => {
  try {
    await query(`
      INSERT INTO EmailLog (
        userId, electionId, candidateId, voteId, type, to, subject, 
        status, messageId, error, announcementType, reminderType, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      notificationData.userId || null,
      notificationData.electionId || null,
      notificationData.candidateId || null,
      notificationData.voteId || null,
      notificationData.type,
      notificationData.to,
      notificationData.subject,
      notificationData.status,
      notificationData.messageId || null,
      notificationData.error || null,
      notificationData.announcementType || null,
      notificationData.reminderType || null
    ]);
  } catch (error) {
    console.error('Failed to log email notification:', error.message);
  }
};

/**
 * Get email notification logs
 */
const getEmailLogs = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 50,
      type = '',
      status = '',
      userId = '',
      electionId = '',
      startDate = '',
      endDate = ''
    } = filters;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (type) {
      whereClause += ` AND type = ?`;
      params.push(type);
    }

    if (status) {
      whereClause += ` AND status = ?`;
      params.push(status);
    }

    if (userId) {
      whereClause += ` AND userId = ?`;
      params.push(userId);
    }

    if (electionId) {
      whereClause += ` AND electionId = ?`;
      params.push(electionId);
    }

    if (startDate) {
      whereClause += ` AND createdAt >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND createdAt <= ?`;
      params.push(endDate);
    }

    // Get logs with user details
    const logs = await query(`
      SELECT 
        el.*,
        u.email as userEmail,
        u.firstName,
        u.lastName,
        e.title as electionTitle
      FROM EmailLog el
      LEFT JOIN User u ON el.userId = u.userId
      LEFT JOIN Election e ON el.electionId = e.electionId
      ${whereClause}
      ORDER BY el.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count for pagination
    const totalCount = await query(`
      SELECT COUNT(*) as count
      FROM EmailLog el
      ${whereClause}
    `, params);

    return {
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit)
      },
      filters
    };
  } catch (error) {
    throw new Error(`Failed to get email logs: ${error.message}`);
  }
};

/**
 * Get email statistics
 */
const getEmailStatistics = async () => {
  try {
    const stats = await query(`
      SELECT 
        type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as last24h,
        COUNT(*) FILTER (WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as last7d
      FROM EmailLog
      GROUP BY type
    `);

    const totalStats = await query(`
      SELECT 
        COUNT(*) as totalEmails,
        COUNT(*) FILTER (WHERE status = 'sent') as totalSent,
        COUNT(*) FILTER (WHERE status = 'failed') as totalFailed,
        COUNT(*) FILTER (WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as last24h,
        COUNT(*) FILTER (WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as last7d,
        COUNT(*) FILTER (WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as last30d
      FROM EmailLog
    `);

    return {
      success: true,
      statistics: {
        byType: stats,
        totals: totalStats[0] || {}
      }
    };
  } catch (error) {
    throw new Error(`Failed to get email statistics: ${error.message}`);
  }
};

// HTML Template Generators
const generateVoteConfirmationHTML = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Vote Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .vote-info { background: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Vote Confirmation</h1>
        </div>
        <div class="content">
          <p>Dear ${data.userName},</p>
          <p>Your vote has been successfully recorded. Here are the details:</p>
          
          <div class="vote-info">
            <h3>Election Details</h3>
            <p><strong>Election:</strong> ${data.electionTitle}</p>
            <p><strong>Candidate:</strong> ${data.candidateName} ${data.candidateParty ? `(${data.candidateParty})` : ''}</p>
            <p><strong>Vote ID:</strong> ${data.voteId}</p>
            <p><strong>Timestamp:</strong> ${data.timestamp}</p>
          </div>
          
          <p>This confirmation serves as proof that your vote has been cast and recorded in our secure system. Your vote is confidential and cannot be changed.</p>
          
          <p>If you did not cast this vote or have any concerns, please contact our support team immediately.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Voting System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateVoteConfirmationText = (data) => {
  return `
VOTE CONFIRMATION

Dear ${data.userName},

Your vote has been successfully recorded. Here are the details:

ELECTION DETAILS
Election: ${data.electionTitle}
Candidate: ${data.candidateName} ${data.candidateParty ? `(${data.candidateParty})` : ''}
Vote ID: ${data.voteId}
Timestamp: ${data.timestamp}

This confirmation serves as proof that your vote has been cast and recorded in our secure system. Your vote is confidential and cannot be changed.

If you did not cast this vote or have any concerns, please contact our support team immediately.

This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Voting System. All rights reserved.
  `;
};

const generateElectionAnnouncementHTML = (election, type) => {
  const titles = {
    new: 'New Election Announcement',
    upcoming: 'Upcoming Election Reminder',
    cancelled: 'Election Cancellation Notice'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${titles[type]}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .election-info { background: white; padding: 15px; border-left: 4px solid #2196F3; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${titles[type]}</h1>
        </div>
        <div class="content">
          <p>Dear {{userName}},</p>
          <p>We are pleased to announce a new election:</p>
          
          <div class="election-info">
            <h3>${election.title}</h3>
            <p><strong>Description:</strong> ${election.description || 'No description available'}</p>
            <p><strong>Start Time:</strong> ${new Date(election.startTime).toLocaleString()}</p>
            <p><strong>End Time:</strong> ${new Date(election.endTime).toLocaleString()}</p>
            <p><strong>Type:</strong> ${election.isPublic ? 'Public' : 'Private'}</p>
          </div>
          
          <p>You can participate in this election by logging into your account and casting your vote during the specified time period.</p>
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Voting System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateElectionAnnouncementText = (election, type) => {
  const titles = {
    new: 'NEW ELECTION ANNOUNCEMENT',
    upcoming: 'UPCOMING ELECTION REMINDER',
    cancelled: 'ELECTION CANCELLATION NOTICE'
  };

  return `
${titles[type]}

Dear {{userName}},

We are pleased to announce a new election:

${election.title}
Description: ${election.description || 'No description available'}
Start Time: ${new Date(election.startTime).toLocaleString()}
End Time: ${new Date(election.endTime).toLocaleString()}
Type: ${election.isPublic ? 'Public' : 'Private'}

You can participate in this election by logging into your account and casting your vote during the specified time period.

If you have any questions, please don't hesitate to contact our support team.

This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Voting System. All rights reserved.
  `;
};

const generateElectionReminderHTML = (election, type) => {
  const titles = {
    start_soon: 'Election Starting Soon',
    ending_soon: 'Election Ending Soon',
    last_day: 'Last Day to Vote'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${titles[type]}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .reminder-info { background: white; padding: 15px; border-left: 4px solid #FF9800; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${titles[type]}</h1>
        </div>
        <div class="content">
          <p>Dear {{userName}},</p>
          <p>This is a friendly reminder about the upcoming election:</p>
          
          <div class="reminder-info">
            <h3>${election.title}</h3>
            <p><strong>End Time:</strong> ${new Date(election.endTime).toLocaleString()}</p>
            <p><strong>Status:</strong> You haven't voted yet</p>
          </div>
          
          <p>Don't miss your chance to participate! Log in to your account to cast your vote before the deadline.</p>
          
          <p>Your vote matters and makes a difference!</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Voting System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateElectionReminderText = (election, type) => {
  const titles = {
    start_soon: 'ELECTION STARTING SOON',
    ending_soon: 'ELECTION ENDING SOON',
    last_day: 'LAST DAY TO VOTE'
  };

  return `
${titles[type]}

Dear {{userName}},

This is a friendly reminder about the upcoming election:

${election.title}
End Time: ${new Date(election.endTime).toLocaleString()}
Status: You haven't voted yet

Don't miss your chance to participate! Log in to your account to cast your vote before the deadline.

Your vote matters and makes a difference!

This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Voting System. All rights reserved.
  `;
};

const generateElectionResultsHTML = (election, results) => {
  const resultsHTML = results.map((result, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${result.name}</td>
      <td>${result.party || 'Independent'}</td>
      <td><strong>${result.voteCount}</strong></td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Election Results</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #9C27B0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .results-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .results-table th, .results-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .results-table th { background-color: #f2f2f2; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Election Results</h1>
        </div>
        <div class="content">
          <p>Dear {{userName}},</p>
          <p>The results for the following election are now available:</p>
          
          <h3>${election.title}</h3>
          
          <table class="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Party</th>
                <th>Votes</th>
              </tr>
            </thead>
            <tbody>
              ${resultsHTML}
            </tbody>
          </table>
          
          <p>Thank you for participating in this election. Your contribution helps make our democratic process stronger.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Voting System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateElectionResultsText = (election, results) => {
  const resultsText = results.map((result, index) => 
    `${index + 1}. ${result.name} ${result.party ? `(${result.party})` : ''} - ${result.voteCount} votes`
  ).join('\n');

  return `
ELECTION RESULTS

Dear {{userName}},

The results for the following election are now available:

${election.title}

RESULTS:
${resultsText}

Thank you for participating in this election. Your contribution helps make our democratic process stronger.

This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Voting System. All rights reserved.
  `;
};

const generateAdminNotificationHTML = (subject, message) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Admin Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .notification { background: white; padding: 15px; border-left: 4px solid #f44336; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Admin Alert</h1>
        </div>
        <div class="content">
          <div class="notification">
            <h3>${subject}</h3>
            <p>${message}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>Please review this notification and take appropriate action if necessary.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Voting System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateAdminNotificationText = (subject, message) => {
  return `
ADMIN ALERT

${subject}

${message}

Timestamp: ${new Date().toLocaleString()}

Please review this notification and take appropriate action if necessary.

This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Voting System. All rights reserved.
  `;
};

// Helper functions
const getElectionAnnouncementSubject = (election, type) => {
  const subjects = {
    new: `New Election: ${election.title}`,
    upcoming: `Upcoming Election: ${election.title}`,
    cancelled: `Cancelled Election: ${election.title}`
  };
  return subjects[type] || `Election Update: ${election.title}`;
};

const getElectionReminderSubject = (election, type) => {
  const subjects = {
    start_soon: `Reminder: ${election.title} Starting Soon`,
    ending_soon: `URGENT: ${election.title} Ending Soon`,
    last_day: `LAST CHANCE: ${election.title} - Final Day to Vote`
  };
  return subjects[type] || `Reminder: ${election.title}`;
};

module.exports = {
  initializeEmailService,
  sendVoteConfirmation,
  sendElectionAnnouncement,
  sendElectionReminder,
  sendElectionResults,
  sendAdminNotification,
  getEmailLogs,
  getEmailStatistics
};

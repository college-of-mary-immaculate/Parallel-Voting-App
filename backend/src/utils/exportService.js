const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const { mockDatabase } = require('../config/database');
const { logAdminEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } = require('./auditLogger');

// Export configuration
const EXPORT_CONFIG = {
  maxRecords: 10000,
  exportDir: path.join(__dirname, '../../exports'),
  csvDelimiter: ',',
  csvQuote: '"',
  pdfOptions: {
    format: 'A4',
    orientation: 'portrait',
    border: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm'
    }
  },
  allowedFormats: ['csv', 'pdf', 'json'],
  retentionDays: 30,
  compressionEnabled: true
};

// Ensure export directory exists
const ensureExportDir = async () => {
  try {
    if (!fs.existsSync(EXPORT_CONFIG.exportDir)) {
      fs.mkdirSync(EXPORT_CONFIG.exportDir, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating export directory:', error);
    throw error;
  }
};

// Generate unique filename
const generateFilename = (type, format, electionId = null) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const electionPart = electionId ? `_election_${electionId}` : '';
  return `${type}${electionPart}_${timestamp}.${format}`;
};

// Escape CSV field
const escapeCSVField = (field) => {
  if (field === null || field === undefined) return '';
  
  const stringField = String(field);
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(EXPORT_CONFIG.csvDelimiter) || 
      stringField.includes(EXPORT_CONFIG.csvQuote) || 
      stringField.includes('\n') || 
      stringField.includes('\r')) {
    return EXPORT_CONFIG.csvQuote + stringField.replace(/"/g, '""') + EXPORT_CONFIG.csvQuote;
  }
  
  return stringField;
};

// Convert array of objects to CSV
const convertToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return headers ? headers.join(EXPORT_CONFIG.csvDelimiter) : '';
  }

  // Use provided headers or extract from first row
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create header row
  const headerRow = csvHeaders.map(header => escapeCSVField(header)).join(EXPORT_CONFIG.csvDelimiter);
  
  // Create data rows
  const dataRows = data.map(row => {
    return csvHeaders.map(header => {
      const value = row[header];
      return escapeCSVField(value);
    }).join(EXPORT_CONFIG.csvDelimiter);
  });

  return [headerRow, ...dataRows].join('\n');
};

// Generate PDF content (simplified version - in production, use a proper PDF library)
const generatePDFContent = (data, title, metadata = {}) => {
  const timestamp = new Date().toLocaleString();
  
  let content = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .metadata { margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p>Generated on: ${timestamp}</p>
    </div>
    
    <div class="metadata">
        <h3>Export Information</h3>
        <p><strong>Total Records:</strong> ${data.length}</p>
        <p><strong>Export Format:</strong> PDF</p>
        ${metadata.electionId ? `<p><strong>Election ID:</strong> ${metadata.electionId}</p>` : ''}
        ${metadata.electionTitle ? `<p><strong>Election Title:</strong> ${metadata.electionTitle}</p>` : ''}
        ${metadata.exportedBy ? `<p><strong>Exported By:</strong> User ID ${metadata.exportedBy}</p>` : ''}
    </div>
`;

  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    
    content += `
    <table>
        <thead>
            <tr>
                ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${data.map(row => `
                <tr>
                    ${headers.map(header => `<td>${escapeCSVField(row[header])}</td>`).join('')}
                </tr>
            `).join('')}
        </tbody>
    </table>
`;
  } else {
    content += '<p>No records found.</p>';
  }

  content += `
    <div class="footer">
        <p>This document was generated automatically by the Parallel Voting System.</p>
        <p>Page 1 of 1</p>
    </div>
</body>
</html>
`;

  return content;
};

// Export election results
const exportElectionResults = async (electionId, format = 'csv', userId = null) => {
  try {
    await ensureExportDir();
    
    if (!EXPORT_CONFIG.allowedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}. Allowed formats: ${EXPORT_CONFIG.allowedFormats.join(', ')}`);
    }

    // Get election details
    const electionQuery = 'SELECT * FROM Election WHERE electionId = ?';
    const [election] = await mockDatabase.query(electionQuery, [electionId]);
    
    if (!election) {
      throw new Error('Election not found');
    }

    // Get candidates
    const candidatesQuery = `
      SELECT c.*, 
             COUNT(v.voteId) as voteCount,
             ROUND((COUNT(v.voteId) / (SELECT COUNT(*) FROM Vote WHERE electionId = ?)) * 100, 2) as percentage
      FROM Candidate c
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      WHERE c.electionId = ?
      GROUP BY c.candidateId
      ORDER BY voteCount DESC
    `;
    const candidates = await mockDatabase.query(candidatesQuery, [electionId, electionId]);

    // Get total votes
    const totalVotesQuery = 'SELECT COUNT(*) as total FROM Vote WHERE electionId = ?';
    const [{ total }] = await mockDatabase.query(totalVotesQuery, [electionId]);

    // Prepare export data
    const exportData = candidates.map(candidate => ({
      'Candidate ID': candidate.candidateId,
      'Candidate Name': candidate.firstName + ' ' + candidate.lastName,
      'Party': candidate.party || 'Independent',
      'Position': candidate.position || 'Not specified',
      'Vote Count': candidate.voteCount || 0,
      'Percentage': candidate.percentage || 0,
      'Status': candidate.isActive ? 'Active' : 'Inactive'
    }));

    // Add summary row
    exportData.push({
      'Candidate ID': 'TOTAL',
      'Candidate Name': 'Total Votes Cast',
      'Party': '-',
      'Position': '-',
      'Vote Count': total,
      'Percentage': '100.00',
      'Status': '-'
    });

    // Generate filename
    const filename = generateFilename('election_results', format, electionId);
    const filepath = path.join(EXPORT_CONFIG.exportDir, filename);

    let content;
    let mimeType;

    switch (format) {
      case 'csv':
        content = convertToCSV(exportData);
        mimeType = 'text/csv';
        break;
      
      case 'pdf':
        content = generatePDFContent(exportData, `Election Results - ${election.title}`, {
          electionId,
          electionTitle: election.title,
          exportedBy: userId
        });
        mimeType = 'text/html'; // In production, this would be application/pdf
        break;
      
      case 'json':
        content = JSON.stringify({
          election: {
            id: election.electionId,
            title: election.title,
            description: election.description,
            startTime: election.startTime,
            endTime: election.endTime,
            status: election.status
          },
          results: exportData,
          summary: {
            totalVotes: total,
            totalCandidates: candidates.length,
            exportDate: new Date().toISOString()
          }
        }, null, 2);
        mimeType = 'application/json';
        break;
    }

    // Write file
    await writeFile(filepath, content);

    // Log export event
    if (userId) {
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Export System' },
        session: { id: 'export-session' },
        id: 'export-req'
      };

      await logAdminEvent(
        AUDIT_EVENTS.DATA_EXPORT,
        userId,
        'export_election_results',
        'election_results',
        { oldValue: null, newValue: { electionId, format, recordCount: exportData.length } },
        mockReq,
        { success: true, severity: 'medium' }
      );
    }

    return {
      success: true,
      filename,
      filepath,
      mimeType,
      size: content.length,
      recordCount: exportData.length,
      format,
      electionId,
      electionTitle: election.title,
      exportDate: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error exporting election results:', error);
    throw error;
  }
};

// Export user data
const exportUserData = async (filters = {}, format = 'csv', userId = null) => {
  try {
    await ensureExportDir();
    
    if (!EXPORT_CONFIG.allowedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}. Allowed formats: ${EXPORT_CONFIG.allowedFormats.join(', ')}`);
    }

    // Build query with filters
    let query = `
      SELECT 
        u.userId,
        u.email,
        u.firstName,
        u.lastName,
        u.role,
        u.isActive,
        u.isEmailVerified,
        u.createdAt,
        u.lastLoginAt,
        u.phoneNumber,
        u.dateOfBirth,
        u.address,
        u.city,
        u.state,
        u.country,
        u.postalCode,
        (SELECT COUNT(*) FROM Vote WHERE userId = u.userId) as totalVotes,
        (SELECT COUNT(*) FROM Election WHERE createdBy = u.userId) as electionsCreated,
        (SELECT COUNT(*) FROM Candidate WHERE userId = u.userId) as candidatesRegistered
      FROM User u
      WHERE 1=1
    `;

    const params = [];

    // Apply filters
    if (filters.role) {
      query += ' AND u.role = ?';
      params.push(filters.role);
    }

    if (filters.isActive !== undefined) {
      query += ' AND u.isActive = ?';
      params.push(filters.isActive);
    }

    if (filters.isEmailVerified !== undefined) {
      query += ' AND u.isEmailVerified = ?';
      params.push(filters.isEmailVerified);
    }

    if (filters.startDate) {
      query += ' AND u.createdAt >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND u.createdAt <= ?';
      params.push(filters.endDate);
    }

    if (filters.search) {
      query += ' AND (u.email LIKE ? OR u.firstName LIKE ? OR u.lastName LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY u.createdAt DESC';

    // Limit results
    const limit = Math.min(filters.limit || EXPORT_CONFIG.maxRecords, EXPORT_CONFIG.maxRecords);
    query += ' LIMIT ?';
    params.push(limit);

    const users = await mockDatabase.query(query, params);

    // Prepare export data (exclude sensitive information)
    const exportData = users.map(user => ({
      'User ID': user.userId,
      'Email': user.email,
      'First Name': user.firstName,
      'Last Name': user.lastName,
      'Full Name': `${user.firstName} ${user.lastName}`,
      'Role': user.role,
      'Status': user.isActive ? 'Active' : 'Inactive',
      'Email Verified': user.isEmailVerified ? 'Yes' : 'No',
      'Registration Date': user.createdAt,
      'Last Login': user.lastLoginAt || 'Never',
      'Phone Number': user.phoneNumber || 'Not provided',
      'Date of Birth': user.dateOfBirth || 'Not provided',
      'Address': user.address || 'Not provided',
      'City': user.city || 'Not provided',
      'State': user.state || 'Not provided',
      'Country': user.country || 'Not provided',
      'Postal Code': user.postalCode || 'Not provided',
      'Total Votes Cast': user.totalVotes || 0,
      'Elections Created': user.electionsCreated || 0,
      'Candidates Registered': user.candidatesRegistered || 0
    }));

    // Generate filename
    const filename = generateFilename('user_data', format);
    const filepath = path.join(EXPORT_CONFIG.exportDir, filename);

    let content;
    let mimeType;

    switch (format) {
      case 'csv':
        content = convertToCSV(exportData);
        mimeType = 'text/csv';
        break;
      
      case 'pdf':
        content = generatePDFContent(exportData, 'User Data Export', {
          exportedBy: userId,
          filters: filters
        });
        mimeType = 'text/html'; // In production, this would be application/pdf
        break;
      
      case 'json':
        content = JSON.stringify({
          filters: filters,
          users: exportData,
          summary: {
            totalUsers: exportData.length,
            exportDate: new Date().toISOString(),
            filtersApplied: filters
          }
        }, null, 2);
        mimeType = 'application/json';
        break;
    }

    // Write file
    await writeFile(filepath, content);

    // Log export event
    if (userId) {
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Export System' },
        session: { id: 'export-session' },
        id: 'export-req'
      };

      await logAdminEvent(
        AUDIT_EVENTS.DATA_EXPORT,
        userId,
        'export_user_data',
        'user_data',
        { oldValue: null, newValue: { format, filters, recordCount: exportData.length } },
        mockReq,
        { success: true, severity: 'high' } // User data export is high sensitivity
      );
    }

    return {
      success: true,
      filename,
      filepath,
      mimeType,
      size: content.length,
      recordCount: exportData.length,
      format,
      filters,
      exportDate: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
};

// Export voting data
const exportVotingData = async (electionId, filters = {}, format = 'csv', userId = null) => {
  try {
    await ensureExportDir();
    
    if (!EXPORT_CONFIG.allowedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}. Allowed formats: ${EXPORT_CONFIG.allowedFormats.join(', ')}`);
    }

    // Build query with filters
    let query = `
      SELECT 
        v.voteId,
        v.electionId,
        v.candidateId,
        v.userId,
        v.votedAt,
        v.verificationCode,
        v.isVerified,
        v.ipAddress,
        v.userAgent,
        e.title as electionTitle,
        c.firstName as candidateFirstName,
        c.lastName as candidateLastName,
        c.party as candidateParty,
        u.email as voterEmail,
        u.firstName as voterFirstName,
        u.lastName as voterLastName
      FROM Vote v
      JOIN Election e ON v.electionId = e.electionId
      JOIN Candidate c ON v.candidateId = c.candidateId
      JOIN User u ON v.userId = u.userId
      WHERE v.electionId = ?
    `;

    const params = [electionId];

    // Apply additional filters
    if (filters.isVerified !== undefined) {
      query += ' AND v.isVerified = ?';
      params.push(filters.isVerified);
    }

    if (filters.startDate) {
      query += ' AND v.votedAt >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND v.votedAt <= ?';
      params.push(filters.endDate);
    }

    if (filters.candidateId) {
      query += ' AND v.candidateId = ?';
      params.push(filters.candidateId);
    }

    query += ' ORDER BY v.votedAt DESC';

    // Limit results
    const limit = Math.min(filters.limit || EXPORT_CONFIG.maxRecords, EXPORT_CONFIG.maxRecords);
    query += ' LIMIT ?';
    params.push(limit);

    const votes = await mockDatabase.query(query, params);

    // Prepare export data
    const exportData = votes.map(vote => ({
      'Vote ID': vote.voteId,
      'Election ID': vote.electionId,
      'Election Title': vote.electionTitle,
      'Candidate ID': vote.candidateId,
      'Candidate Name': `${vote.candidateFirstName} ${vote.candidateLastName}`,
      'Candidate Party': vote.candidateParty || 'Independent',
      'Voter ID': vote.userId,
      'Voter Email': vote.voterEmail,
      'Voter Name': `${vote.voterFirstName} ${vote.voterLastName}`,
      'Vote Date': vote.votedAt,
      'Verification Code': vote.verificationCode,
      'Is Verified': vote.isVerified ? 'Yes' : 'No',
      'IP Address': vote.ipAddress,
      'User Agent': vote.userAgent
    }));

    // Get election details for metadata
    const electionQuery = 'SELECT * FROM Election WHERE electionId = ?';
    const [election] = await mockDatabase.query(electionQuery, [electionId]);

    // Generate filename
    const filename = generateFilename('voting_data', format, electionId);
    const filepath = path.join(EXPORT_CONFIG.exportDir, filename);

    let content;
    let mimeType;

    switch (format) {
      case 'csv':
        content = convertToCSV(exportData);
        mimeType = 'text/csv';
        break;
      
      case 'pdf':
        content = generatePDFContent(exportData, `Voting Data - ${election.title}`, {
          electionId,
          electionTitle: election.title,
          exportedBy: userId,
          filters: filters
        });
        mimeType = 'text/html'; // In production, this would be application/pdf
        break;
      
      case 'json':
        content = JSON.stringify({
          election: {
            id: election.electionId,
            title: election.title,
            description: election.description
          },
          filters: filters,
          votes: exportData,
          summary: {
            totalVotes: exportData.length,
            exportDate: new Date().toISOString(),
            filtersApplied: filters
          }
        }, null, 2);
        mimeType = 'application/json';
        break;
    }

    // Write file
    await writeFile(filepath, content);

    // Log export event
    if (userId) {
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Export System' },
        session: { id: 'export-session' },
        id: 'export-req'
      };

      await logAdminEvent(
        AUDIT_EVENTS.DATA_EXPORT,
        userId,
        'export_voting_data',
        'voting_data',
        { oldValue: null, newValue: { electionId, format, filters, recordCount: exportData.length } },
        mockReq,
        { success: true, severity: 'high' } // Voting data export is high sensitivity
      );
    }

    return {
      success: true,
      filename,
      filepath,
      mimeType,
      size: content.length,
      recordCount: exportData.length,
      format,
      electionId,
      electionTitle: election.title,
      filters,
      exportDate: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error exporting voting data:', error);
    throw error;
  }
};

// Export analytics data
const exportAnalyticsData = async (electionId, format = 'csv', userId = null) => {
  try {
    await ensureExportDir();
    
    if (!EXPORT_CONFIG.allowedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}. Allowed formats: ${EXPORT_CONFIG.allowedFormats.join(', ')}`);
    }

    // Get election details
    const electionQuery = 'SELECT * FROM Election WHERE electionId = ?';
    const [election] = await mockDatabase.query(electionQuery, [electionId]);
    
    if (!election) {
      throw new Error('Election not found');
    }

    // Get voting analytics
    const votingAnalyticsQuery = `
      SELECT 
        DATE(v.votedAt) as voteDate,
        COUNT(*) as votesPerDay,
        HOUR(v.votedAt) as voteHour,
        COUNT(*) as votesPerHour
      FROM Vote v
      WHERE v.electionId = ?
      GROUP BY DATE(v.votedAt), HOUR(v.votedAt)
      ORDER BY voteDate, voteHour
    `;
    const votingAnalytics = await mockDatabase.query(votingAnalyticsQuery, [electionId]);

    // Get candidate performance
    const candidateAnalyticsQuery = `
      SELECT 
        c.candidateId,
        c.firstName,
        c.lastName,
        c.party,
        COUNT(v.voteId) as totalVotes,
        ROUND((COUNT(v.voteId) / (SELECT COUNT(*) FROM Vote WHERE electionId = ?)) * 100, 2) as votePercentage,
        MIN(v.votedAt) as firstVoteTime,
        MAX(v.votedAt) as lastVoteTime
      FROM Candidate c
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      WHERE c.electionId = ?
      GROUP BY c.candidateId
      ORDER BY totalVotes DESC
    `;
    const candidateAnalytics = await mockDatabase.query(candidateAnalyticsQuery, [electionId, electionId]);

    // Get voter demographics
    const voterDemographicsQuery = `
      SELECT 
        u.role,
        COUNT(DISTINCT v.userId) as voterCount,
        ROUND((COUNT(DISTINCT v.userId) / (SELECT COUNT(*) FROM User WHERE isActive = 1)) * 100, 2) as participationRate
      FROM Vote v
      JOIN User u ON v.userId = u.userId
      WHERE v.electionId = ?
      GROUP BY u.role
      ORDER BY voterCount DESC
    `;
    const voterDemographics = await mockDatabase.query(voterDemographicsQuery, [electionId]);

    // Prepare export data
    const exportData = {
      election: {
        id: election.electionId,
        title: election.title,
        description: election.description,
        startTime: election.startTime,
        endTime: election.endTime,
        status: election.status
      },
      votingAnalytics: votingAnalytics,
      candidatePerformance: candidateAnalytics,
      voterDemographics: voterDemographics,
      summary: {
        totalVotes: votingAnalytics.reduce((sum, day) => sum + day.votesPerDay, 0),
        totalCandidates: candidateAnalytics.length,
        uniqueVoters: voterDemographics.reduce((sum, role) => sum + role.voterCount, 0),
        exportDate: new Date().toISOString()
      }
    };

    // Generate filename
    const filename = generateFilename('analytics_data', format, electionId);
    const filepath = path.join(EXPORT_CONFIG.exportDir, filename);

    let content;
    let mimeType;

    switch (format) {
      case 'csv':
        // For CSV, create a summary table
        const csvData = candidateAnalytics.map(candidate => ({
          'Candidate ID': candidate.candidateId,
          'Candidate Name': `${candidate.firstName} ${candidate.lastName}`,
          'Party': candidate.party || 'Independent',
          'Total Votes': candidate.totalVotes,
          'Vote Percentage': candidate.votePercentage,
          'First Vote': candidate.firstVoteTime,
          'Last Vote': candidate.lastVoteTime
        }));
        
        content = convertToCSV(csvData);
        mimeType = 'text/csv';
        break;
      
      case 'pdf':
        const pdfData = [
          ...candidateAnalytics.map(candidate => ({
            'Candidate': `${candidate.firstName} ${candidate.lastName}`,
            'Party': candidate.party || 'Independent',
            'Votes': candidate.totalVotes,
            'Percentage': candidate.votePercentage + '%'
          }))
        ];
        
        content = generatePDFContent(pdfData, `Election Analytics - ${election.title}`, {
          electionId,
          electionTitle: election.title,
          exportedBy: userId
        });
        mimeType = 'text/html'; // In production, this would be application/pdf
        break;
      
      case 'json':
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        break;
    }

    // Write file
    await writeFile(filepath, content);

    // Log export event
    if (userId) {
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Export System' },
        session: { id: 'export-session' },
        id: 'export-req'
      };

      await logAdminEvent(
        AUDIT_EVENTS.DATA_EXPORT,
        userId,
        'export_analytics_data',
        'analytics_data',
        { oldValue: null, newValue: { electionId, format, recordCount: exportData.summary.totalVotes } },
        mockReq,
        { success: true, severity: 'medium' }
      );
    }

    return {
      success: true,
      filename,
      filepath,
      mimeType,
      size: content.length,
      format,
      electionId,
      electionTitle: election.title,
      exportDate: new Date().toISOString(),
      summary: exportData.summary
    };

  } catch (error) {
    console.error('Error exporting analytics data:', error);
    throw error;
  }
};

// Get export history
const getExportHistory = async (userId = null, limit = 50) => {
  try {
    // In a real implementation, this would query an export history table
    // For now, return mock data
    const mockHistory = [
      {
        exportId: 'exp-001',
        type: 'election_results',
        format: 'csv',
        filename: 'election_results_election_1_2024-03-14T10-30-00-000Z.csv',
        recordCount: 150,
        size: 2048,
        exportedBy: 1,
        exportedAt: '2024-03-14T10:30:00Z',
        status: 'completed'
      },
      {
        exportId: 'exp-002',
        type: 'user_data',
        format: 'pdf',
        filename: 'user_data_2024-03-14T11-15-00-000Z.pdf',
        recordCount: 500,
        size: 1024000,
        exportedBy: 1,
        exportedAt: '2024-03-14T11:15:00Z',
        status: 'completed'
      }
    ];

    return {
      success: true,
      exports: mockHistory.slice(0, limit),
      total: mockHistory.length
    };

  } catch (error) {
    console.error('Error getting export history:', error);
    throw error;
  }
};

// Cleanup old export files
const cleanupOldExports = async () => {
  try {
    await ensureExportDir();
    
    const files = fs.readdirSync(EXPORT_CONFIG.exportDir);
    const cutoffDate = new Date(Date.now() - (EXPORT_CONFIG.retentionDays * 24 * 60 * 60 * 1000));
    let deletedCount = 0;

    for (const file of files) {
      const filepath = path.join(EXPORT_CONFIG.exportDir, file);
      const stats = fs.statSync(filepath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filepath);
        deletedCount++;
      }
    }

    return {
      success: true,
      deletedCount,
      cutoffDate: cutoffDate.toISOString()
    };

  } catch (error) {
    console.error('Error cleaning up old exports:', error);
    throw error;
  }
};

module.exports = {
  exportElectionResults,
  exportUserData,
  exportVotingData,
  exportAnalyticsData,
  getExportHistory,
  cleanupOldExports,
  EXPORT_CONFIG
};

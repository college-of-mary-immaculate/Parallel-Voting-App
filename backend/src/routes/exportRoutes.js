const express = require('express');
const validator = require('validator');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const {
  exportElectionResults,
  exportUserData,
  exportVotingData,
  exportAnalyticsData,
  getExportHistory,
  cleanupOldExports,
  EXPORT_CONFIG
} = require('../utils/exportService');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// GET /api/export/election/:electionId/results - Export election results
router.get('/election/:electionId/results', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { electionId } = req.params;
    const { format = 'csv' } = req.query;

    // Validate election ID
    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    // Validate format
    if (!EXPORT_CONFIG.allowedFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Allowed formats: ${EXPORT_CONFIG.allowedFormats.join(', ')}`
      });
    }

    const exportResult = await exportElectionResults(parseInt(electionId), format, req.user.userId);

    // Set appropriate headers for file download
    const filename = exportResult.filename;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Length', exportResult.size);

    // Send file
    const fileStream = fs.createReadStream(exportResult.filepath);
    fileStream.pipe(res);

    // Log successful export
    console.log(`Election results exported: ${filename} by user ${req.user.userId}`);

  } catch (error) {
    console.error('Export election results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export election results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/export/users - Export user data
router.get('/users', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    
    // Validate format
    if (!EXPORT_CONFIG.allowedFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Allowed formats: ${EXPORT_CONFIG.allowedFormats.join(', ')}`
      });
    }

    // Build filters from query parameters
    const filters = {
      role: req.query.role || undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      isEmailVerified: req.query.isEmailVerified !== undefined ? req.query.isEmailVerified === 'true' : undefined,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      search: req.query.search || undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    // Validate filters
    if (filters.startDate && !validator.isDate(filters.startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format'
      });
    }

    if (filters.endDate && !validator.isDate(filters.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date format'
      });
    }

    if (filters.limit && (!validator.isInt(filters.limit.toString(), { min: 1, max: EXPORT_CONFIG.maxRecords }) || filters.limit > EXPORT_CONFIG.maxRecords)) {
      return res.status(400).json({
        success: false,
        message: `Invalid limit. Must be between 1 and ${EXPORT_CONFIG.maxRecords}`
      });
    }

    const exportResult = await exportUserData(filters, format, req.user.userId);

    // Set appropriate headers for file download
    const filename = exportResult.filename;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Length', exportResult.size);

    // Send file
    const fileStream = fs.createReadStream(exportResult.filepath);
    fileStream.pipe(res);

    // Log successful export
    console.log(`User data exported: ${filename} by user ${req.user.userId}`);

  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export user data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/export/election/:electionId/voting-data - Export voting data
router.get('/election/:electionId/voting-data', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { electionId } = req.params;
    const { format = 'csv' } = req.query;

    // Validate election ID
    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    // Validate format
    if (!EXPORT_CONFIG.allowedFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Allowed formats: ${EXPORT_CONFIG.allowedFormats.join(', ')}`
      });
    }

    // Build filters from query parameters
    const filters = {
      isVerified: req.query.isVerified !== undefined ? req.query.isVerified === 'true' : undefined,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      candidateId: req.query.candidateId ? parseInt(req.query.candidateId) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    // Validate filters
    if (filters.startDate && !validator.isDate(filters.startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format'
      });
    }

    if (filters.endDate && !validator.isDate(filters.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date format'
      });
    }

    if (filters.candidateId && !validator.isInt(filters.candidateId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID'
      });
    }

    if (filters.limit && (!validator.isInt(filters.limit.toString(), { min: 1, max: EXPORT_CONFIG.maxRecords }) || filters.limit > EXPORT_CONFIG.maxRecords)) {
      return res.status(400).json({
        success: false,
        message: `Invalid limit. Must be between 1 and ${EXPORT_CONFIG.maxRecords}`
      });
    }

    const exportResult = await exportVotingData(parseInt(electionId), filters, format, req.user.userId);

    // Set appropriate headers for file download
    const filename = exportResult.filename;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Length', exportResult.size);

    // Send file
    const fileStream = fs.createReadStream(exportResult.filepath);
    fileStream.pipe(res);

    // Log successful export
    console.log(`Voting data exported: ${filename} by user ${req.user.userId}`);

  } catch (error) {
    console.error('Export voting data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export voting data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/export/election/:electionId/analytics - Export analytics data
router.get('/election/:electionId/analytics', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { electionId } = req.params;
    const { format = 'csv' } = req.query;

    // Validate election ID
    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    // Validate format
    if (!EXPORT_CONFIG.allowedFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Allowed formats: ${EXPORT_CONFIG.allowedFormats.join(', ')}`
      });
    }

    const exportResult = await exportAnalyticsData(parseInt(electionId), format, req.user.userId);

    // Set appropriate headers for file download
    const filename = exportResult.filename;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Length', exportResult.size);

    // Send file
    const fileStream = fs.createReadStream(exportResult.filepath);
    fileStream.pipe(res);

    // Log successful export
    console.log(`Analytics data exported: ${filename} by user ${req.user.userId}`);

  } catch (error) {
    console.error('Export analytics data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/export/history - Get export history
router.get('/history', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // Validate limit
    if (!validator.isInt(limit.toString(), { min: 1, max: 100 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit. Must be between 1 and 100'
      });
    }

    const history = await getExportHistory(req.user.userId, parseInt(limit));

    res.json({
      success: true,
      message: 'Export history retrieved successfully',
      data: history,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get export history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve export history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/export/cleanup - Cleanup old export files
router.post('/cleanup', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const cleanupResult = await cleanupOldExports();

    res.json({
      success: true,
      message: 'Export cleanup completed successfully',
      data: cleanupResult,
      timestamp: new Date().toISOString()
    });

    // Log cleanup action
    console.log(`Export cleanup performed by user ${req.user.userId}: ${cleanupResult.deletedCount} files deleted`);

  } catch (error) {
    console.error('Export cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup export files',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/export/config - Get export configuration
router.get('/config', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const config = {
      allowedFormats: EXPORT_CONFIG.allowedFormats,
      maxRecords: EXPORT_CONFIG.maxRecords,
      retentionDays: EXPORT_CONFIG.retentionDays,
      compressionEnabled: EXPORT_CONFIG.compressionEnabled,
      csvDelimiter: EXPORT_CONFIG.csvDelimiter,
      pdfOptions: EXPORT_CONFIG.pdfOptions
    };

    res.json({
      success: true,
      message: 'Export configuration retrieved successfully',
      data: config,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get export config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve export configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/export/formats - Get available export formats
router.get('/formats', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const formats = EXPORT_CONFIG.allowedFormats.map(format => ({
      format,
      description: getFormatDescription(format),
      mimeType: getFormatMimeType(format),
      features: getFormatFeatures(format)
    }));

    res.json({
      success: true,
      message: 'Export formats retrieved successfully',
      data: formats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get export formats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve export formats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/export/preview/:type - Preview export data (without downloading)
router.get('/preview/:type', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { type } = req.params;
    const { electionId, limit = 10 } = req.query;

    // Validate type
    const validTypes = ['election-results', 'user-data', 'voting-data', 'analytics'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate limit
    if (!validator.isInt(limit.toString(), { min: 1, max: 50 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit. Must be between 1 and 50'
      });
    }

    let previewData;

    switch (type) {
      case 'election-results':
        if (!electionId || !validator.isInt(electionId.toString(), { min: 1 })) {
          return res.status(400).json({
            success: false,
            message: 'Valid election ID is required for election results preview'
          });
        }
        // Get preview data (limited records)
        previewData = await getElectionResultsPreview(parseInt(electionId), parseInt(limit));
        break;

      case 'user-data':
        previewData = await getUserDataPreview(parseInt(limit));
        break;

      case 'voting-data':
        if (!electionId || !validator.isInt(electionId.toString(), { min: 1 })) {
          return res.status(400).json({
            success: false,
            message: 'Valid election ID is required for voting data preview'
          });
        }
        previewData = await getVotingDataPreview(parseInt(electionId), parseInt(limit));
        break;

      case 'analytics':
        if (!electionId || !validator.isInt(electionId.toString(), { min: 1 })) {
          return res.status(400).json({
            success: false,
            message: 'Valid election ID is required for analytics preview'
          });
        }
        previewData = await getAnalyticsPreview(parseInt(electionId));
        break;
    }

    res.json({
      success: true,
      message: 'Export preview retrieved successfully',
      data: {
        type,
        preview: previewData,
        recordCount: previewData.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Export preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate export preview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper functions for preview data (simplified versions)
async function getElectionResultsPreview(electionId, limit) {
  // Mock implementation - in real app, this would query the database
  return [
    {
      'Candidate ID': 1,
      'Candidate Name': 'John Doe',
      'Party': 'Democratic Party',
      'Position': 'President',
      'Vote Count': 150,
      'Percentage': 45.5,
      'Status': 'Active'
    },
    {
      'Candidate ID': 2,
      'Candidate Name': 'Jane Smith',
      'Party': 'Republican Party',
      'Position': 'President',
      'Vote Count': 120,
      'Percentage': 36.4,
      'Status': 'Active'
    }
  ].slice(0, limit);
}

async function getUserDataPreview(limit) {
  // Mock implementation - in real app, this would query the database
  return [
    {
      'User ID': 1,
      'Email': 'user1@example.com',
      'First Name': 'John',
      'Last Name': 'Doe',
      'Role': 'voter',
      'Status': 'Active',
      'Email Verified': 'Yes',
      'Registration Date': '2024-01-15T10:30:00Z',
      'Total Votes Cast': 3
    },
    {
      'User ID': 2,
      'Email': 'user2@example.com',
      'First Name': 'Jane',
      'Last Name': 'Smith',
      'Role': 'admin',
      'Status': 'Active',
      'Email Verified': 'Yes',
      'Registration Date': '2024-01-10T14:20:00Z',
      'Total Votes Cast': 1
    }
  ].slice(0, limit);
}

async function getVotingDataPreview(electionId, limit) {
  // Mock implementation - in real app, this would query the database
  return [
    {
      'Vote ID': 'vote-uuid-1',
      'Election ID': electionId,
      'Election Title': 'Test Election 2024',
      'Candidate ID': 1,
      'Candidate Name': 'John Doe',
      'Voter Email': 'voter1@example.com',
      'Vote Date': '2024-03-14T10:30:00Z',
      'Is Verified': 'Yes',
      'IP Address': '192.168.1.100'
    }
  ].slice(0, limit);
}

async function getAnalyticsPreview(electionId) {
  // Mock implementation - in real app, this would query the database
  return [
    {
      'Candidate': 'John Doe',
      'Party': 'Democratic Party',
      'Votes': 150,
      'Percentage': '45.5%'
    },
    {
      'Candidate': 'Jane Smith',
      'Party': 'Republican Party',
      'Votes': 120,
      'Percentage': '36.4%'
    }
  ];
}

function getFormatDescription(format) {
  const descriptions = {
    'csv': 'Comma-separated values format, suitable for spreadsheet applications',
    'pdf': 'Portable Document Format, suitable for printing and sharing',
    'json': 'JavaScript Object Notation, suitable for programmatic processing'
  };
  return descriptions[format] || format;
}

function getFormatMimeType(format) {
  const mimeTypes = {
    'csv': 'text/csv',
    'pdf': 'application/pdf',
    'json': 'application/json'
  };
  return mimeTypes[format] || 'application/octet-stream';
}

function getFormatFeatures(format) {
  const features = {
    'csv': ['Tabular data', 'Spreadsheet compatible', 'Small file size'],
    'pdf': ['Formatted output', 'Print-ready', 'Professional appearance'],
    'json': ['Structured data', 'Machine-readable', 'Full data preservation']
  };
  return features[format] || [];
}

module.exports = router;

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Advanced Error Logging System
 * Provides structured logging with different levels and destinations
 */

class ErrorLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
    this.logLevels = {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug'
    };
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Create structured log entry
   */
  createLogEntry(level, error, req = null, additionalData = {}) {
    const logEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level: level,
      error: {
        name: error.name,
        message: error.message,
        code: error.errorCode || 'UNKNOWN',
        statusCode: error.statusCode || 500,
        stack: error.stack,
        details: error.details || null
      },
      request: req ? {
        method: req.method,
        url: req.originalUrl,
        headers: this.sanitizeHeaders(req.headers),
        params: req.params,
        query: req.query,
        body: this.sanitizeBody(req.body),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId || null
      } : null,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      ...additionalData
    };

    return logEntry;
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'password'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  sanitizeBody(body) {
    if (!body) return null;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'creditCard'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Write log entry to file
   */
  writeToFile(logEntry) {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `app-${date}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      fs.appendFileSync(logFile, logLine);
    } catch (writeError) {
      console.error('Failed to write to log file:', writeError);
    }
  }

  /**
   * Log error with full context
   */
  logError(error, req = null, additionalData = {}) {
    const logEntry = this.createLogEntry(this.logLevels.ERROR, error, req, additionalData);
    
    // Write to file
    this.writeToFile(logEntry);
    
    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 ERROR:', JSON.stringify(logEntry, null, 2));
    }
    
    // Send to external logging service (if configured)
    this.sendToExternalService(logEntry);
    
    return logEntry;
  }

  /**
   * Log warning
   */
  logWarning(message, req = null, additionalData = {}) {
    const logEntry = this.createLogEntry(this.logLevels.WARN, { message, name: 'Warning' }, req, additionalData);
    this.writeToFile(logEntry);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  WARNING:', JSON.stringify(logEntry, null, 2));
    }
  }

  /**
   * Log info
   */
  logInfo(message, req = null, additionalData = {}) {
    const logEntry = this.createLogEntry(this.logLevels.INFO, { message, name: 'Info' }, req, additionalData);
    this.writeToFile(logEntry);
    
    if (process.env.NODE_ENV === 'development') {
      console.info('ℹ️  INFO:', JSON.stringify(logEntry, null, 2));
    }
  }

  /**
   * Send log to external service (placeholder for services like Sentry, Loggly, etc.)
   */
  sendToExternalService(logEntry) {
    // Integration with external logging services can be added here
    // Example: Sentry, Loggly, Papertrail, etc.
    
    if (process.env.LOG_SERVICE_URL) {
      // Placeholder for external service integration
      // fetch(process.env.LOG_SERVICE_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logEntry)
      // }).catch(err => console.error('Failed to send to external service:', err));
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(hours = 24) {
    const stats = {
      totalErrors: 0,
      errorsByType: {},
      errorsByEndpoint: {},
      errorsByHour: {},
      recentErrors: []
    };

    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .sort()
        .reverse()
        .slice(0, Math.ceil(hours / 24)); // Get relevant log files

      const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        lines.forEach(line => {
          try {
            const logEntry = JSON.parse(line);
            
            if (logEntry.level === 'error' && new Date(logEntry.timestamp).getTime() > cutoffTime) {
              stats.totalErrors++;
              
              // Count by error type
              const errorType = logEntry.error.name || 'Unknown';
              stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
              
              // Count by endpoint
              if (logEntry.request && logEntry.request.url) {
                const endpoint = logEntry.request.url;
                stats.errorsByEndpoint[endpoint] = (stats.errorsByEndpoint[endpoint] || 0) + 1;
              }
              
              // Count by hour
              const hour = new Date(logEntry.timestamp).getHours();
              stats.errorsByHour[hour] = (stats.errorsByHour[hour] || 0) + 1;
              
              // Keep recent errors
              if (stats.recentErrors.length < 10) {
                stats.recentErrors.push({
                  timestamp: logEntry.timestamp,
                  message: logEntry.error.message,
                  endpoint: logEntry.request?.url || 'Unknown',
                  statusCode: logEntry.error.statusCode
                });
              }
            }
          } catch (parseError) {
            // Skip invalid log lines
          }
        });
      });
    } catch (error) {
      console.error('Failed to generate error statistics:', error);
    }

    return stats;
  }

  /**
   * Clean old log files
   */
  cleanupOldLogs(daysToKeep = 30) {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Deleted old log file: ${file}`);
        }
      });
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

// Singleton instance
const errorLogger = new ErrorLogger();

module.exports = errorLogger;

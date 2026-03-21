// const errorLogger = require('./errorLogger');
// const fs = require('fs');
// const path = require('path');

import errorLogger from './errorLogger.js';
import fs from "fs";
import path from 'path';

/**
 * Error Monitoring and Alerting System
 * Provides real-time error monitoring, statistics, and alerting
 */

class ErrorMonitor {
  constructor() {
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate
      errorsPerMinute: 10,
      criticalErrorsPerHour: 5,
      consecutiveErrors: 5
    };
    
    this.alertChannels = {
      email: process.env.ALERT_EMAIL_ENABLED === 'true',
      webhook: process.env.ALERT_WEBHOOK_ENABLED === 'true',
      console: process.env.NODE_ENV === 'development'
    };
    
    this.errorCounts = new Map();
    this.alertCooldowns = new Map();
    this.monitoringEnabled = process.env.ERROR_MONITORING_ENABLED !== 'false';
  }

  /**
   * Check error thresholds and trigger alerts if needed
   */
  async checkErrorThresholds() {
    if (!this.monitoringEnabled) return;

    const stats = errorLogger.getErrorStats(1); // Last hour
    const now = Date.now();

    // Check error rate
    const totalRequests = this.getTotalRequests();
    const errorRate = stats.totalErrors / Math.max(totalRequests, 1);
    
    if (errorRate > this.alertThresholds.errorRate) {
      await this.triggerAlert('HIGH_ERROR_RATE', {
        currentRate: errorRate,
        threshold: this.alertThresholds.errorRate,
        totalErrors: stats.totalErrors,
        totalRequests
      });
    }

    // Check errors per minute
    if (stats.totalErrors > this.alertThresholds.errorsPerMinute) {
      await this.triggerAlert('HIGH_ERROR_VOLUME', {
        errorsPerMinute: stats.totalErrors,
        threshold: this.alertThresholds.errorsPerMinute,
        topErrors: this.getTopErrors(stats.errorsByType, 3)
      });
    }

    // Check for critical errors
    const criticalErrors = this.countCriticalErrors(stats);
    if (criticalErrors > this.alertThresholds.criticalErrorsPerHour) {
      await this.triggerAlert('CRITICAL_ERRORS', {
        criticalErrors,
        threshold: this.alertThresholds.criticalErrorsPerHour,
        criticalErrorTypes: this.getCriticalErrorTypes(stats)
      });
    }

    // Check consecutive errors
    const consecutiveErrors = this.getConsecutiveErrors();
    if (consecutiveErrors > this.alertThresholds.consecutiveErrors) {
      await this.triggerAlert('CONSECUTIVE_ERRORS', {
        consecutiveErrors,
        threshold: this.alertThresholds.consecutiveErrors
      });
    }
  }

  /**
   * Get total requests (placeholder - would integrate with request tracking)
   */
  getTotalRequests() {
    // This would typically come from a request tracking system
    // For now, we'll use a reasonable estimate
    return 1000;
  }

  /**
   * Get top errors by count
   */
  getTopErrors(errorsByType, limit = 3) {
    return Object.entries(errorsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([type, count]) => ({ type, count }));
  }

  /**
   * Count critical errors
   */
  countCriticalErrors(stats) {
    const criticalTypes = ['DatabaseError', 'ExternalServiceError', 'Internal Server Error'];
    return Object.entries(stats.errorsByType)
      .filter(([type]) => criticalTypes.some(critical => type.includes(critical)))
      .reduce((sum, [, count]) => sum + count, 0);
  }

  /**
   * Get critical error types
   */
  getCriticalErrorTypes(stats) {
    const criticalTypes = ['DatabaseError', 'ExternalServiceError', 'Internal Server Error'];
    return Object.keys(stats.errorsByType)
      .filter(type => criticalTypes.some(critical => type.includes(critical)))
      .map(type => ({
        type,
        count: stats.errorsByType[type]
      }));
  }

  /**
   * Get consecutive errors count
   */
  getConsecutiveErrors() {
    const recentErrors = errorLogger.getErrorStats(0.1).recentErrors; // Last 6 minutes
    let consecutiveCount = 0;
    
    for (const error of recentErrors) {
      if (error.statusCode >= 500) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    
    return consecutiveCount;
  }

  /**
   * Trigger alert for various channels
   */
  async triggerAlert(alertType, data) {
    const alertKey = `${alertType}_${Math.floor(Date.now() / (5 * 60 * 1000))}`; // 5-minute cooldown
    
    // Check cooldown
    if (this.alertCooldowns.has(alertKey)) {
      return;
    }
    
    this.alertCooldowns.set(alertKey, true);
    setTimeout(() => this.alertCooldowns.delete(alertKey), 5 * 60 * 1000);

    const alert = this.createAlert(alertType, data);
    
    // Send to different channels
    if (this.alertChannels.console) {
      this.sendConsoleAlert(alert);
    }
    
    if (this.alertChannels.email) {
      await this.sendEmailAlert(alert);
    }
    
    if (this.alertChannels.webhook) {
      await this.sendWebhookAlert(alert);
    }
  }

  /**
   * Create alert object
   */
  createAlert(alertType, data) {
    const alertTypes = {
      'HIGH_ERROR_RATE': {
        severity: 'warning',
        title: 'High Error Rate Detected',
        message: `Error rate has exceeded ${this.alertThresholds.errorRate * 100}%`
      },
      'HIGH_ERROR_VOLUME': {
        severity: 'warning',
        title: 'High Error Volume Detected',
        message: `Error volume has exceeded ${this.alertThresholds.errorsPerMinute} errors per minute`
      },
      'CRITICAL_ERRORS': {
        severity: 'critical',
        title: 'Critical Errors Detected',
        message: `Critical error threshold exceeded`
      },
      'CONSECUTIVE_ERRORS': {
        severity: 'critical',
        title: 'Consecutive Errors Detected',
        message: `Multiple consecutive errors detected`
      }
    };

    const alertConfig = alertTypes[alertType] || {
      severity: 'info',
      title: 'Alert',
      message: 'Unknown alert type'
    };

    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: alertType,
      severity: alertConfig.severity,
      title: alertConfig.title,
      message: alertConfig.message,
      timestamp: new Date().toISOString(),
      data,
      service: 'Parallel Voting App API',
      environment: process.env.NODE_ENV || 'development',
      hostname: require('os').hostname()
    };
  }

  /**
   * Send console alert
   */
  sendConsoleAlert(alert) {
    const severityColors = {
      info: '\u001b[36m', // cyan
      warning: '\u001b[33m', // yellow
      critical: '\u001b[31m' // red
    };
    
    const color = severityColors[alert.severity] || '\u001b[36m';
    const reset = '\u001b[0m';
    
    console.log(`${color}🚨 ALERT [${alert.severity.toUpperCase()}]${reset}`);
    console.log(`${color}   Title: ${alert.title}${reset}`);
    console.log(`${color}   Message: ${alert.message}${reset}`);
    console.log(`${color}   Time: ${alert.timestamp}${reset}`);
    console.log(`${color}   Service: ${alert.service}${reset}`);
    
    if (alert.data) {
      console.log(`${color}   Data: ${JSON.stringify(alert.data, null, 2)}${reset}`);
    }
    
    console.log('');
  }

  /**
   * Send email alert (placeholder)
   */
  async sendEmailAlert(alert) {
    // Integration with email service would go here
    console.log('📧 Email alert would be sent:', alert.title);
    
    // Example email content:
    const emailContent = {
      to: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html: this.generateEmailHTML(alert)
    };
    
    // Would use nodemailer or similar service
    // await emailService.send(emailContent);
  }

  /**
   * Send webhook alert (placeholder)
   */
  async sendWebhookAlert(alert) {
    // Integration with webhook service would go here
    console.log('🔗 Webhook alert would be sent:', alert.title);
    
    if (process.env.ALERT_WEBHOOK_URL) {
      const webhookPayload = {
        alert,
        timestamp: new Date().toISOString()
      };
      
      // Would use fetch or similar:
      // await fetch(process.env.ALERT_WEBHOOK_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(webhookPayload)
      // });
    }
  }

  /**
   * Generate HTML email content
   */
  generateEmailHTML(alert) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #${alert.severity === 'critical' ? 'dc3545' : alert.severity === 'warning' ? 'ffc107' : '17a2b8'};">
          <h2 style="color: #${alert.severity === 'critical' ? 'dc3545' : alert.severity === 'warning' ? 'ffc107' : '17a2b8'}; margin: 0 0 10px 0;">
            🚨 ${alert.title}
          </h2>
          <p style="margin: 0 0 20px 0; color: #6c757d;">${alert.message}</p>
          
          <div style="background: white; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #495057;">Alert Details</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px; font-weight: bold; color: #6c757d;">Time:</td>
                <td style="padding: 5px;">${alert.timestamp}</td>
              </tr>
              <tr>
                <td style="padding: 5px; font-weight: bold; color: #6c757d;">Service:</td>
                <td style="padding: 5px;">${alert.service}</td>
              </tr>
              <tr>
                <td style="padding: 5px; font-weight: bold; color: #6c757d;">Environment:</td>
                <td style="padding: 5px;">${alert.environment}</td>
              </tr>
              <tr>
                <td style="padding: 5px; font-weight: bold; color: #6c757d;">Severity:</td>
                <td style="padding: 5px; text-transform: uppercase; color: #${alert.severity === 'critical' ? 'dc3545' : alert.severity === 'warning' ? 'ffc107' : '17a2b8'};">${alert.severity}</td>
              </tr>
            </table>
          </div>
          
          ${alert.data ? `
          <div style="background: white; padding: 15px; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; color: #495057;">Additional Data</h4>
            <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 0;">${JSON.stringify(alert.data, null, 2)}</pre>
          </div>
          ` : ''}
          
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d;">
            This alert was generated automatically by the Parallel Voting App error monitoring system.
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get error monitoring dashboard data
   */
  getDashboardData() {
    const stats = errorLogger.getErrorStats(24); // Last 24 hours
    
    return {
      summary: {
        totalErrors: stats.totalErrors,
        errorRate: (stats.totalErrors / Math.max(this.getTotalRequests(), 1)) * 100,
        topErrorTypes: this.getTopErrors(stats.errorsByType, 5),
        topEndpoints: this.getTopErrors(stats.errorsByEndpoint, 5),
        hourlyDistribution: stats.errorsByHour
      },
      recentErrors: stats.recentErrors,
      alerts: {
        thresholds: this.alertThresholds,
        channels: this.alertChannels,
        lastAlerts: this.getRecentAlerts()
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }

  /**
   * Get recent alerts (placeholder)
   */
  getRecentAlerts() {
    // Would typically store alerts in a database or cache
    return [];
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    if (!this.monitoringEnabled) return;

    // Check error thresholds every minute
    setInterval(() => {
      this.checkErrorThresholds();
    }, 60 * 1000);

    // Clean up old logs every hour
    setInterval(() => {
      errorLogger.cleanupOldLogs();
    }, 60 * 60 * 1000);

    console.log('🔍 Error monitoring started');
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    console.log('📊 Alert thresholds updated:', this.alertThresholds);
  }

  /**
   * Enable/disable alert channels
   */
  updateAlertChannels(channels) {
    this.alertChannels = { ...this.alertChannels, ...channels };
    console.log('📢 Alert channels updated:', this.alertChannels);
  }
}

// Singleton instance
const errorMonitor = new ErrorMonitor();

//module.exports = errorMonitor;
export default errorMonitor;
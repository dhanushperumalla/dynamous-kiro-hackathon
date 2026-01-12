import twilio from 'twilio';
import { logger } from '../utils/logger';

// SMS template interfaces
interface SMSTemplate {
  message: string;
}

interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

class SMSService {
  private client: twilio.Twilio | null = null;
  private readonly fromNumber: string;
  private readonly isEnabled: boolean;

  constructor() {
    const accountSid = process.env['TWILIO_ACCOUNT_SID'];
    const authToken = process.env['TWILIO_AUTH_TOKEN'];
    this.fromNumber = process.env['TWILIO_FROM_NUMBER'] || '+1234567890';
    const isDevelopment = process.env['NODE_ENV'] === 'development';
    
    // Check if we're using dummy credentials
    const isDummyCredentials = accountSid?.startsWith('dummy-') || authToken?.startsWith('dummy-');
    
    if (isDevelopment && (isDummyCredentials || !accountSid || !authToken)) {
      this.isEnabled = false; // Disable actual sending in development
      logger.info('SMS service running in development mode - messages will be logged instead of sent');
    } else if (accountSid && authToken && !isDummyCredentials) {
      this.isEnabled = true;
      this.client = twilio(accountSid, authToken);
      logger.info('Twilio SMS service initialized');
    } else {
      this.isEnabled = false;
      if (isDevelopment) {
        logger.info('Twilio credentials not configured. SMS service disabled for development.');
      } else {
        logger.warn('Twilio credentials not found. SMS service disabled.');
      }
    }
  }

  /**
   * Send weekly progress reminder SMS
   */
  async sendWeeklyProgressReminder(phoneNumber: string, firstName: string, progressData: {
    completedTargets: number;
    totalTargets: number;
    currentWeek: number;
  }): Promise<void> {
    const { completedTargets, totalTargets, currentWeek } = progressData;
    const completionRate = Math.round((completedTargets / totalTargets) * 100);
    
    const template = this.getWeeklyProgressTemplate(firstName, currentWeek, completionRate);
    
    await this.sendSMS({
      to: phoneNumber,
      message: template.message
    });

    logger.info('Weekly progress reminder SMS sent', {
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      firstName,
      progressData
    });
  }

  /**
   * Send milestone achievement SMS
   */
  async sendMilestoneAchievementSMS(phoneNumber: string, firstName: string, milestone: {
    title: string;
    description: string;
  }): Promise<void> {
    const template = this.getMilestoneAchievementTemplate(firstName, milestone);
    
    await this.sendSMS({
      to: phoneNumber,
      message: template.message
    });

    logger.info('Milestone achievement SMS sent', {
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      firstName,
      milestone: milestone.title
    });
  }

  /**
   * Send inactivity reminder SMS
   */
  async sendInactivityReminderSMS(phoneNumber: string, firstName: string, daysInactive: number): Promise<void> {
    const template = this.getInactivityReminderTemplate(firstName, daysInactive);
    
    await this.sendSMS({
      to: phoneNumber,
      message: template.message
    });

    logger.info('Inactivity reminder SMS sent', {
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      firstName,
      daysInactive
    });
  }

  /**
   * Send job recommendation SMS
   */
  async sendJobRecommendationSMS(phoneNumber: string, firstName: string, jobCount: number): Promise<void> {
    const template = this.getJobRecommendationTemplate(firstName, jobCount);
    
    await this.sendSMS({
      to: phoneNumber,
      message: template.message
    });

    logger.info('Job recommendation SMS sent', {
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      firstName,
      jobCount
    });
  }

  /**
   * Send urgent notification SMS
   */
  async sendUrgentNotificationSMS(phoneNumber: string, firstName: string, message: string): Promise<void> {
    const template = this.getUrgentNotificationTemplate(firstName, message);
    
    await this.sendSMS({
      to: phoneNumber,
      message: template.message
    });

    logger.info('Urgent notification SMS sent', {
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      firstName
    });
  }

  /**
   * Send generic SMS
   */
  private async sendSMS(options: SMSOptions): Promise<string> {
    const isDevelopment = process.env['NODE_ENV'] === 'development';
    
    if (!this.isEnabled) {
      if (isDevelopment) {
        // In development mode, log the SMS instead of sending it
        logger.info('📱 SMS (Development Mode - Not Actually Sent)', {
          to: this.maskPhoneNumber(options.to),
          from: options.from || this.fromNumber,
          message: options.message.substring(0, 100) + (options.message.length > 100 ? '...' : '')
        });
        return `dev_sms_${Date.now()}`;
      } else {
        logger.warn('SMS service disabled. Message not sent.', {
          to: this.maskPhoneNumber(options.to)
        });
        return `disabled_sms_${Date.now()}`;
      }
    }

    if (!this.client) {
      throw new Error('SMS service not properly initialized');
    }

    try {
      const message = await this.client.messages.create({
        body: options.message,
        from: options.from || this.fromNumber,
        to: options.to
      });

      logger.debug('SMS sent successfully', {
        to: this.maskPhoneNumber(options.to),
        messageSid: message.sid,
        status: message.status
      });

      return message.sid;

    } catch (error) {
      logger.error('Failed to send SMS', {
        to: this.maskPhoneNumber(options.to),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw new Error(`Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Weekly progress template
   */
  private getWeeklyProgressTemplate(firstName: string, currentWeek: number, completionRate: number): SMSTemplate {
    const message = `Hi ${firstName}! 📊 Week ${currentWeek} update: You're ${completionRate}% complete! Keep up the great work on your AI-Sikshak learning journey. Check your dashboard for details: ${process.env['FRONTEND_URL'] || 'https://ai-sikshak.com'}/dashboard`;

    return { message };
  }

  /**
   * Milestone achievement template
   */
  private getMilestoneAchievementTemplate(firstName: string, milestone: {
    title: string;
    description: string;
  }): SMSTemplate {
    const message = `🎉 Congratulations ${firstName}! You've achieved: ${milestone.title}. ${milestone.description} Keep up the excellent progress! View your achievements: ${process.env['FRONTEND_URL'] || 'https://ai-sikshak.com'}/achievements`;

    return { message };
  }

  /**
   * Inactivity reminder template
   */
  private getInactivityReminderTemplate(firstName: string, daysInactive: number): SMSTemplate {
    const message = `Hi ${firstName}, we miss you! 😊 It's been ${daysInactive} days since your last learning session. Your career goals are waiting! Continue your journey: ${process.env['FRONTEND_URL'] || 'https://ai-sikshak.com'}/dashboard`;

    return { message };
  }

  /**
   * Job recommendation template
   */
  private getJobRecommendationTemplate(firstName: string, jobCount: number): SMSTemplate {
    const message = `🚀 Great news ${firstName}! We found ${jobCount} new job${jobCount > 1 ? 's' : ''} that match your skills. Don't wait - great opportunities move fast! View jobs: ${process.env['FRONTEND_URL'] || 'https://ai-sikshak.com'}/jobs`;

    return { message };
  }

  /**
   * Urgent notification template
   */
  private getUrgentNotificationTemplate(firstName: string, message: string): SMSTemplate {
    const smsMessage = `⚠️ ${firstName}, ${message} Check AI-Sikshak for details: ${process.env['FRONTEND_URL'] || 'https://ai-sikshak.com'}/dashboard`;

    return { message: smsMessage };
  }

  /**
   * Mask phone number for logging (privacy)
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    const visibleDigits = 2;
    const maskedPart = '*'.repeat(phoneNumber.length - visibleDigits * 2);
    return phoneNumber.substring(0, visibleDigits) + maskedPart + phoneNumber.substring(phoneNumber.length - visibleDigits);
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phoneNumber: string, countryCode: string = '+1'): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If it doesn't start with country code, add it
    if (!phoneNumber.startsWith('+')) {
      return `${countryCode}${digits}`;
    }
    
    return phoneNumber;
  }

  /**
   * Check SMS delivery status
   */
  async checkDeliveryStatus(messageSid: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    if (!this.isEnabled || !this.client) {
      return { status: 'disabled' };
    }

    try {
      const message = await this.client.messages(messageSid).fetch();
      
      return {
        status: message.status,
        ...(message.errorCode && { errorCode: message.errorCode.toString() }),
        ...(message.errorMessage && { errorMessage: message.errorMessage })
      };
    } catch (error) {
      logger.error('Failed to check SMS delivery status', {
        messageSid,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        status: 'unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const smsService = new SMSService();
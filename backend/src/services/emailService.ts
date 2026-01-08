import sgMail from '@sendgrid/mail';
import { logger } from '@/utils/logger';

// Email template interfaces
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface EmailOptions {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

class EmailService {
  private readonly fromEmail: string;
  private readonly isEnabled: boolean;

  constructor() {
    // Initialize SendGrid
    const apiKey = process.env['SENDGRID_API_KEY'];
    this.fromEmail = process.env['FROM_EMAIL'] || 'noreply@ai-sikshak.com';
    const isDevelopment = process.env['NODE_ENV'] === 'development';
    
    // Check if we're using dummy credentials
    const isDummyKey = apiKey?.startsWith('dummy-') || apiKey?.startsWith('SG.dummy-');
    
    if (isDevelopment && (isDummyKey || !apiKey)) {
      this.isEnabled = false; // Disable actual sending in development
      logger.info('Email service running in development mode - emails will be logged instead of sent');
    } else if (apiKey && !isDummyKey) {
      this.isEnabled = true;
      sgMail.setApiKey(apiKey);
      logger.info('SendGrid email service initialized');
    } else {
      this.isEnabled = false;
      if (isDevelopment) {
        logger.info('SendGrid API key not configured. Email service disabled for development.');
      } else {
        logger.warn('SendGrid API key not found. Email service disabled.');
      }
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(email: string, token: string, firstName: string): Promise<void> {
    const verificationUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const template = this.getEmailVerificationTemplate(firstName, verificationUrl);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    logger.info('Email verification sent', {
      email,
      firstName
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<void> {
    const resetUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const template = this.getPasswordResetTemplate(firstName, resetUrl);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    logger.info('Password reset email sent', {
      email,
      firstName
    });
  }

  /**
   * Send welcome email after email verification
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const template = this.getWelcomeTemplate(firstName);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    logger.info('Welcome email sent', {
      email,
      firstName
    });
  }

  /**
   * Send weekly progress reminder
   */
  async sendWeeklyProgressReminder(email: string, firstName: string, progressData: {
    completedTargets: number;
    totalTargets: number;
    currentWeek: number;
    nextTargets: string[];
  }): Promise<void> {
    const template = this.getWeeklyProgressTemplate(firstName, progressData);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    logger.info('Weekly progress reminder sent', {
      email,
      firstName,
      progressData
    });
  }

  /**
   * Send milestone achievement email
   */
  async sendMilestoneAchievementEmail(email: string, firstName: string, milestone: {
    title: string;
    description: string;
    badge?: string;
    nextMilestone?: string;
  }): Promise<void> {
    const template = this.getMilestoneAchievementTemplate(firstName, milestone);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    logger.info('Milestone achievement email sent', {
      email,
      firstName,
      milestone: milestone.title
    });
  }

  /**
   * Send job recommendation email
   */
  async sendJobRecommendationEmail(email: string, firstName: string, jobs: Array<{
    title: string;
    company: string;
    location: string;
    matchScore: number;
    url: string;
  }>): Promise<void> {
    const template = this.getJobRecommendationTemplate(firstName, jobs);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    logger.info('Job recommendation email sent', {
      email,
      firstName,
      jobCount: jobs.length
    });
  }

  /**
   * Send generic email
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    const isDevelopment = process.env['NODE_ENV'] === 'development';
    
    if (!this.isEnabled) {
      if (isDevelopment) {
        // In development mode, log the email instead of sending it
        logger.info('📧 EMAIL (Development Mode - Not Actually Sent)', {
          to: options.to,
          from: options.from || this.fromEmail,
          subject: options.subject,
          text: options.text.substring(0, 200) + '...',
          html: 'HTML content available'
        });
        return;
      } else {
        logger.warn('Email service disabled. Email not sent.', {
          to: options.to,
          subject: options.subject
        });
        return;
      }
    }

    try {
      const msg = {
        to: options.to,
        from: options.from || this.fromEmail,
        subject: options.subject,
        text: options.text,
        html: options.html,
        ...options.templateId && {
          templateId: options.templateId,
          dynamicTemplateData: options.dynamicTemplateData
        }
      };

      await sgMail.send(msg);
      
      logger.debug('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        from: msg.from
      });

    } catch (error) {
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Email verification template
   */
  private getEmailVerificationTemplate(firstName: string, verificationUrl: string): EmailTemplate {
    const subject = 'Verify Your AI-Sikshak Account';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to AI-Sikshak!</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Thank you for joining AI-Sikshak! We're excited to help you discover your ideal career path through AI-powered mentorship.</p>
            <p>To get started, please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
            <p>This verification link will expire in 24 hours for security reasons.</p>
            <p>If you didn't create an account with AI-Sikshak, please ignore this email.</p>
            <p>Best regards,<br>The AI-Sikshak Team</p>
          </div>
          <div class="footer">
            <p>© 2026 AI-Sikshak. All rights reserved.</p>
            <p>This email was sent to ${firstName} because you signed up for AI-Sikshak.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hi ${firstName},

      Thank you for joining AI-Sikshak! We're excited to help you discover your ideal career path.

      To get started, please verify your email address by visiting this link:
      ${verificationUrl}

      This verification link will expire in 24 hours for security reasons.

      If you didn't create an account with AI-Sikshak, please ignore this email.

      Best regards,
      The AI-Sikshak Team
    `;

    return { subject, html, text };
  }

  /**
   * Password reset template
   */
  private getPasswordResetTemplate(firstName: string, resetUrl: string): EmailTemplate {
    const subject = 'Reset Your AI-Sikshak Password';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; background: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>We received a request to reset your AI-Sikshak account password.</p>
            <p>Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #DC2626;">${resetUrl}</p>
            <div class="warning">
              <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
            </div>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <p>For security reasons, we recommend using a strong, unique password for your AI-Sikshak account.</p>
            <p>Best regards,<br>The AI-Sikshak Team</p>
          </div>
          <div class="footer">
            <p>© 2026 AI-Sikshak. All rights reserved.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hi ${firstName},

      We received a request to reset your AI-Sikshak account password.

      To create a new password, visit this link:
      ${resetUrl}

      This password reset link will expire in 1 hour for security reasons.

      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

      Best regards,
      The AI-Sikshak Team
    `;

    return { subject, html, text };
  }

  /**
   * Welcome email template
   */
  private getWelcomeTemplate(firstName: string): EmailTemplate {
    const subject = 'Welcome to AI-Sikshak - Let\'s Start Your Career Journey!';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AI-Sikshak</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .steps { background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to AI-Sikshak!</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Congratulations! Your email has been verified and your AI-Sikshak account is now active.</p>
            <p>We're thrilled to have you join thousands of students and graduates who are discovering their ideal career paths with our AI-powered mentorship platform.</p>
            
            <div class="steps">
              <h3>🚀 Ready to get started? Here's what's next:</h3>
              <ol>
                <li><strong>Complete Your Interest Assessment</strong> - Discover career domains that align with your interests</li>
                <li><strong>Choose Your Path</strong> - Select from AI-recommended career domains</li>
                <li><strong>Follow Your Learning Roadmap</strong> - Get personalized weekly targets and milestones</li>
                <li><strong>Connect with Opportunities</strong> - Receive job matches as you progress</li>
              </ol>
            </div>

            <p style="text-align: center;">
              <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/dashboard" class="button">Start Your Journey</a>
            </p>

            <p>Need help getting started? Check out our <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/help">Help Center</a> or reply to this email with any questions.</p>
            
            <p>We're here to support you every step of the way!</p>
            <p>Best regards,<br>The AI-Sikshak Team</p>
          </div>
          <div class="footer">
            <p>© 2026 AI-Sikshak. All rights reserved.</p>
            <p>Follow us on social media for career tips and success stories!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hi ${firstName},

      Congratulations! Your email has been verified and your AI-Sikshak account is now active.

      Ready to get started? Here's what's next:
      1. Complete Your Interest Assessment - Discover career domains that align with your interests
      2. Choose Your Path - Select from AI-recommended career domains  
      3. Follow Your Learning Roadmap - Get personalized weekly targets and milestones
      4. Connect with Opportunities - Receive job matches as you progress

      Start your journey: ${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/dashboard

      Need help? Visit our Help Center or reply to this email with any questions.

      Best regards,
      The AI-Sikshak Team
    `;

    return { subject, html, text };
  }

  /**
   * Weekly progress template
   */
  private getWeeklyProgressTemplate(firstName: string, progressData: {
    completedTargets: number;
    totalTargets: number;
    currentWeek: number;
    nextTargets: string[];
  }): EmailTemplate {
    const { completedTargets, totalTargets, currentWeek, nextTargets } = progressData;
    const completionRate = Math.round((completedTargets / totalTargets) * 100);
    
    const subject = `Week ${currentWeek} Progress Update - ${completionRate}% Complete!`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Progress Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .progress-bar { background: #E5E7EB; height: 20px; border-radius: 10px; margin: 20px 0; }
          .progress-fill { background: #8B5CF6; height: 100%; border-radius: 10px; width: ${completionRate}%; }
          .targets { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Week ${currentWeek} Progress Update</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Great work this week! Here's your progress summary:</p>
            
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
            <p style="text-align: center;"><strong>${completedTargets} of ${totalTargets} targets completed (${completionRate}%)</strong></p>
            
            ${nextTargets.length > 0 ? `
            <div class="targets">
              <h3>🎯 Coming up next:</h3>
              <ul>
                ${nextTargets.map(target => `<li>${target}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
            
            <p style="text-align: center;">
              <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/dashboard" class="button">Continue Learning</a>
            </p>
            
            <p>Keep up the momentum! Every step brings you closer to your career goals.</p>
            <p>Best regards,<br>The AI-Sikshak Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hi ${firstName},

      Week ${currentWeek} Progress Update

      Great work this week! Here's your progress summary:
      ${completedTargets} of ${totalTargets} targets completed (${completionRate}%)

      ${nextTargets.length > 0 ? `
      Coming up next:
      ${nextTargets.map(target => `- ${target}`).join('\n')}
      ` : ''}

      Continue your learning journey: ${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/dashboard

      Keep up the momentum! Every step brings you closer to your career goals.

      Best regards,
      The AI-Sikshak Team
    `;

    return { subject, html, text };
  }

  /**
   * Milestone achievement template
   */
  private getMilestoneAchievementTemplate(firstName: string, milestone: {
    title: string;
    description: string;
    badge?: string;
    nextMilestone?: string;
  }): EmailTemplate {
    const subject = `🏆 Congratulations! You've achieved: ${milestone.title}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Milestone Achievement</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; text-align: center; }
          .badge { font-size: 48px; margin: 20px 0; }
          .achievement { background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Milestone Achieved!</h1>
          </div>
          <div class="content">
            <h2>Congratulations, ${firstName}!</h2>
            
            ${milestone.badge ? `<div class="badge">${milestone.badge}</div>` : ''}
            
            <div class="achievement">
              <h3>${milestone.title}</h3>
              <p>${milestone.description}</p>
            </div>
            
            <p>This is a significant step forward in your career journey. Your dedication and hard work are paying off!</p>
            
            ${milestone.nextMilestone ? `
              <p><strong>Next milestone:</strong> ${milestone.nextMilestone}</p>
            ` : ''}
            
            <p style="text-align: center;">
              <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/achievements" class="button">View All Achievements</a>
            </p>
            
            <p>Share your success with friends and family - you've earned it!</p>
            <p>Best regards,<br>The AI-Sikshak Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Congratulations, ${firstName}!

      🏆 Milestone Achieved: ${milestone.title}

      ${milestone.description}

      This is a significant step forward in your career journey. Your dedication and hard work are paying off!

      ${milestone.nextMilestone ? `Next milestone: ${milestone.nextMilestone}` : ''}

      View all your achievements: ${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/achievements

      Share your success with friends and family - you've earned it!

      Best regards,
      The AI-Sikshak Team
    `;

    return { subject, html, text };
  }

  /**
   * Job recommendation template
   */
  private getJobRecommendationTemplate(firstName: string, jobs: Array<{
    title: string;
    company: string;
    location: string;
    matchScore: number;
    url: string;
  }>): EmailTemplate {
    const subject = `🚀 ${jobs.length} New Job Matches Found!`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Recommendations</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .job { background: #F0FDF4; border: 1px solid #D1FAE5; padding: 15px; margin: 15px 0; border-radius: 8px; }
          .match-score { background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .button { display: inline-block; background: #059669; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 New Job Opportunities</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Great news! We found ${jobs.length} new job opportunities that match your skills and career goals:</p>
            
            ${jobs.map(job => `
              <div class="job">
                <h3>${job.title}</h3>
                <p><strong>${job.company}</strong> • ${job.location}</p>
                <p>Match Score: <span class="match-score">${job.matchScore}%</span></p>
                <a href="${job.url}" class="button">View Job Details</a>
              </div>
            `).join('')}
            
            <p>These positions align well with your current skill level and learning progress. Don't wait too long - great opportunities move fast!</p>
            
            <p style="text-align: center;">
              <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/jobs" class="button">View All Job Matches</a>
            </p>
            
            <p>Need help with your application? Check out our <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/resources/interview-prep">interview preparation resources</a>.</p>
            
            <p>Best of luck with your applications!</p>
            <p>Best regards,<br>The AI-Sikshak Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hi ${firstName},

      Great news! We found ${jobs.length} new job opportunities that match your skills and career goals:

      ${jobs.map(job => `
      ${job.title} at ${job.company}
      Location: ${job.location}
      Match Score: ${job.matchScore}%
      Apply: ${job.url}
      `).join('\n')}

      These positions align well with your current skill level and learning progress. Don't wait too long - great opportunities move fast!

      View all job matches: ${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/jobs

      Need help with your application? Check out our interview preparation resources.

      Best of luck with your applications!

      Best regards,
      The AI-Sikshak Team
    `;

    return { subject, html, text };
  }
}

// Export singleton instance
export const emailService = new EmailService();
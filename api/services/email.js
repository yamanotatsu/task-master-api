import { logger } from '../utils/logger.js';

/**
 * Email service for sending transactional emails
 * This is a basic implementation that can be extended with actual email providers
 * like SendGrid, AWS SES, or Resend
 */

/**
 * Send invitation email to a new member
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.organizationName - Name of the organization
 * @param {string} params.inviterName - Name of the person sending the invite
 * @param {string} params.role - Role being assigned to the invitee
 * @param {string} params.inviteUrl - URL to accept the invitation
 * @returns {Promise<void>}
 */
export async function sendInvitationEmail({ to, organizationName, inviterName, role, inviteUrl }) {
  try {
    // In production, integrate with an email service provider
    // For now, we'll log the email details
    logger.info('Sending invitation email', {
      to,
      organizationName,
      inviterName,
      role,
      inviteUrl
    });

    // Example email content
    const subject = `You've been invited to join ${organizationName}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're Invited!</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
              <p>Click the button below to accept the invitation and get started:</p>
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #eee; padding: 10px; border-radius: 4px;">${inviteUrl}</p>
              <p>This invitation will expire in 7 days.</p>
              <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Task Master. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
You're Invited!

${inviterName} has invited you to join ${organizationName} as a ${role}.

Accept the invitation by visiting:
${inviteUrl}

This invitation will expire in 7 days.

If you weren't expecting this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Task Master. All rights reserved.
    `;

    // TODO: Implement actual email sending
    // Example with SendGrid:
    // const msg = {
    //   to,
    //   from: process.env.EMAIL_FROM || 'noreply@taskmaster.com',
    //   subject,
    //   html: htmlContent,
    //   text: textContent
    // };
    // await sgMail.send(msg);

    // For development, you can use console.log or save to a file
    if (process.env.NODE_ENV === 'development') {
      console.log('=== INVITATION EMAIL ===');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Invite URL:', inviteUrl);
      console.log('=======================');
    }

  } catch (error) {
    logger.error('Failed to send invitation email:', error);
    throw error;
  }
}

/**
 * Send welcome email to a new user
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.name - User's name
 * @returns {Promise<void>}
 */
export async function sendWelcomeEmail({ to, name }) {
  try {
    logger.info('Sending welcome email', { to, name });

    const subject = 'Welcome to Task Master!';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Task Master!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Welcome to Task Master! We're excited to have you on board.</p>
              <p>Task Master helps you manage projects and tasks efficiently with your team. Here are some things you can do:</p>
              <ul>
                <li>Create and manage organizations</li>
                <li>Invite team members to collaborate</li>
                <li>Create projects and break them down into tasks</li>
                <li>Track progress and dependencies</li>
                <li>And much more!</li>
              </ul>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
              </div>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Happy task managing!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Task Master. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // TODO: Implement actual email sending

  } catch (error) {
    logger.error('Failed to send welcome email:', error);
    throw error;
  }
}

/**
 * Send password reset email
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.resetUrl - Password reset URL
 * @returns {Promise<void>}
 */
export async function sendPasswordResetEmail({ to, resetUrl }) {
  try {
    logger.info('Sending password reset email', { to });

    const subject = 'Reset Your Task Master Password';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p>We received a request to reset your Task Master password. Click the button below to create a new password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #eee; padding: 10px; border-radius: 4px;">${resetUrl}</p>
              <p>This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Task Master. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // TODO: Implement actual email sending

  } catch (error) {
    logger.error('Failed to send password reset email:', error);
    throw error;
  }
}

/**
 * Send organization role change notification
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.name - User's name
 * @param {string} params.organizationName - Organization name
 * @param {string} params.newRole - New role assigned
 * @param {string} params.changedBy - Name of the person who made the change
 * @returns {Promise<void>}
 */
export async function sendRoleChangeEmail({ to, name, organizationName, newRole, changedBy }) {
  try {
    logger.info('Sending role change email', { to, organizationName, newRole });

    const subject = `Your role has been updated in ${organizationName}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .role-badge { display: inline-block; padding: 6px 12px; background-color: #2196F3; color: white; border-radius: 4px; font-weight: bold; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Role Update Notification</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Your role in <strong>${organizationName}</strong> has been updated by ${changedBy}.</p>
              <p>Your new role is: <span class="role-badge">${newRole.toUpperCase()}</span></p>
              ${newRole === 'admin' ? `
                <p>As an admin, you now have the following permissions:</p>
                <ul>
                  <li>Invite and remove members</li>
                  <li>Update member roles</li>
                  <li>Manage organization settings</li>
                  <li>Delete the organization</li>
                </ul>
              ` : `
                <p>As a member, you can:</p>
                <ul>
                  <li>View all organization projects</li>
                  <li>Create and manage tasks</li>
                  <li>Collaborate with other members</li>
                </ul>
              `}
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Task Master. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // TODO: Implement actual email sending

  } catch (error) {
    logger.error('Failed to send role change email:', error);
    throw error;
  }
}

/**
 * Send removal notification when a member is removed from an organization
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.name - User's name
 * @param {string} params.organizationName - Organization name
 * @param {string} params.removedBy - Name of the person who removed them
 * @returns {Promise<void>}
 */
export async function sendRemovalEmail({ to, name, organizationName, removedBy }) {
  try {
    logger.info('Sending removal notification email', { to, organizationName });

    const subject = `You have been removed from ${organizationName}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Organization Access Update</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>This is to inform you that you have been removed from <strong>${organizationName}</strong> by ${removedBy}.</p>
              <p>You no longer have access to:</p>
              <ul>
                <li>Organization projects and tasks</li>
                <li>Team collaboration features</li>
                <li>Organization resources</li>
              </ul>
              <p>If you believe this was done in error, please contact the organization administrator.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Task Master. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // TODO: Implement actual email sending

  } catch (error) {
    logger.error('Failed to send removal email:', error);
    throw error;
  }
}

/**
 * Initialize email service with provider
 * This function should be called during app initialization
 * @param {Object} config - Email service configuration
 * @returns {Promise<void>}
 */
export async function initializeEmailService(config = {}) {
  try {
    // Initialize your email service provider here
    // Example: SendGrid, AWS SES, Resend, etc.
    
    if (process.env.SENDGRID_API_KEY) {
      // Example SendGrid initialization
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      logger.info('Email service initialized with SendGrid');
    } else if (process.env.AWS_SES_REGION) {
      // Example AWS SES initialization
      logger.info('Email service initialized with AWS SES');
    } else {
      logger.warn('No email service provider configured. Emails will be logged only.');
    }
  } catch (error) {
    logger.error('Failed to initialize email service:', error);
    throw error;
  }
}

// Export all email functions
export default {
  sendInvitationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendRoleChangeEmail,
  sendRemovalEmail,
  initializeEmailService
};
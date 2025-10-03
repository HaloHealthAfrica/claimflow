// SendGrid email service for notification delivery
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailTemplate {
  templateId: string;
  dynamicTemplateData: Record<string, any>;
}

export interface EmailNotification {
  to: string;
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  template?: EmailTemplate;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

export class SendGridEmailService {
  private defaultFrom = process.env.SENDGRID_FROM_EMAIL || 'notifications@claimflow.com';
  private defaultFromName = 'ClaimFlow';

  // Send email notification
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SendGrid API key not configured');
        return false;
      }

      const msg: any = {
        to: notification.to,
        from: {
          email: notification.from || this.defaultFrom,
          name: this.defaultFromName,
        },
        subject: notification.subject,
      };

      // Use template if provided
      if (notification.template) {
        msg.templateId = notification.template.templateId;
        msg.dynamicTemplateData = notification.template.dynamicTemplateData;
      } else {
        // Use HTML/text content
        if (notification.html) {
          msg.html = notification.html;
        }
        if (notification.text) {
          msg.text = notification.text;
        }
      }

      // Add attachments if provided
      if (notification.attachments) {
        msg.attachments = notification.attachments;
      }

      await sgMail.send(msg);
      console.log('Email sent successfully to:', notification.to);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // Send bulk emails
  async sendBulkEmails(notifications: EmailNotification[]): Promise<boolean[]> {
    const results = await Promise.allSettled(
      notifications.map(notification => this.sendEmail(notification))
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : false
    );
  }

  // Generate email templates for different notification types
  generateClaimSubmittedEmail(userEmail: string, claimData: any): EmailNotification {
    return {
      to: userEmail,
      subject: `Claim ${claimData.claimId} Submitted Successfully`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #28a745; margin-bottom: 20px;">✅ Claim Submitted Successfully</h2>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0;">Claim Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Claim ID:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${claimData.claimId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">$${(claimData.amount / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Service Date:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${claimData.serviceDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Provider:</strong></td>
                  <td style="padding: 8px 0;">${claimData.providerName}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #1976d2;">
                <strong>What's Next?</strong><br>
                Your claim has been submitted to your insurance company. You'll receive updates as your claim is processed.
                Typical processing time is 5-10 business days.
              </p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/claims/${claimData.claimId}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Track Your Claim
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
            <p>This is an automated message from ClaimFlow. Please do not reply to this email.</p>
          </div>
        </div>
      `,
      text: `
        Claim Submitted Successfully
        
        Your claim ${claimData.claimId} for $${(claimData.amount / 100).toFixed(2)} has been submitted successfully.
        
        Service Date: ${claimData.serviceDate}
        Provider: ${claimData.providerName}
        
        You'll receive updates as your claim is processed. Typical processing time is 5-10 business days.
        
        Track your claim: ${process.env.NEXT_PUBLIC_APP_URL}/claims/${claimData.claimId}
      `,
    };
  }

  generateClaimApprovedEmail(userEmail: string, claimData: any): EmailNotification {
    return {
      to: userEmail,
      subject: `🎉 Great News! Claim ${claimData.claimId} Approved`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #28a745; margin-bottom: 20px;">🎉 Claim Approved!</h2>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0;">Approved Claim Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Claim ID:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${claimData.claimId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Approved Amount:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #28a745; font-weight: bold;">$${(claimData.approvedAmount / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Expected Payment:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${claimData.paymentDays || '5-10'} business days</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #155724;">
                <strong>Payment Information:</strong><br>
                Your payment will be processed and sent to your registered payment method within ${claimData.paymentDays || '5-10'} business days.
              </p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/claims/${claimData.claimId}" 
                 style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Claim Details
              </a>
            </div>
          </div>
        </div>
      `,
    };
  }

  generateClaimDeniedEmail(userEmail: string, claimData: any): EmailNotification {
    return {
      to: userEmail,
      subject: `Claim ${claimData.claimId} Update - Action Required`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #dc3545; margin-bottom: 20px;">Claim Update - Action Required</h2>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0;">Claim Information</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Claim ID:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${claimData.claimId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Status:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #dc3545;">Denied</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Reason:</strong></td>
                  <td style="padding: 8px 0;">${claimData.denialReason}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #856404;">
                <strong>Don't worry - you have options!</strong><br>
                You can appeal this decision or get help with AI-generated appeal letters.
              </p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/appeals/${claimData.claimId}" 
                 style="background-color: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                File an Appeal
              </a>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/claims/${claimData.claimId}" 
                 style="background-color: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Details
              </a>
            </div>
          </div>
        </div>
      `,
    };
  }

  generatePaymentReceivedEmail(userEmail: string, paymentData: any): EmailNotification {
    return {
      to: userEmail,
      subject: `💰 Payment Received - $${(paymentData.amount / 100).toFixed(2)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #28a745; margin-bottom: 20px;">💰 Payment Received!</h2>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0;">Payment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Claim ID:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${paymentData.claimId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Payment Amount:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #28a745; font-weight: bold; font-size: 18px;">$${(paymentData.amount / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Payment Date:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${paymentData.paymentDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Payment Method:</strong></td>
                  <td style="padding: 8px 0;">${paymentData.paymentMethod || 'Direct Deposit'}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #155724;">
                <strong>Payment Processed Successfully!</strong><br>
                The payment should appear in your account within 1-2 business days.
              </p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/claims/${paymentData.claimId}" 
                 style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Payment Details
              </a>
            </div>
          </div>
        </div>
      `,
    };
  }
}

// Singleton instance
export const sendGridEmail = new SendGridEmailService();
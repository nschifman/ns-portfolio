// Email Alert Function - Optional integration
// You can use services like SendGrid, Mailgun, or your own SMTP

export async function sendEmailAlert(subject, message) {
  // Example using a simple email service
  // Replace with your preferred email service
  
  const emailData = {
    to: 'nschifman@gmail.com',
    subject: `🚨 R2 Usage Alert: ${subject}`,
    message: message
  };
  
  console.log('📧 Email Alert Data:', emailData);
  console.log('💡 To enable email alerts, integrate with your preferred email service');
  
  // Example integrations:
  // - SendGrid: https://sendgrid.com/
  // - Mailgun: https://mailgun.com/
  // - AWS SES: https://aws.amazon.com/ses/
  // - Nodemailer: https://nodemailer.com/
  
  return emailData;
}

// Usage example:
// await sendEmailAlert('Storage Limit', 'You are approaching your R2 storage limit'); 
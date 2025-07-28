import { sendEmailAlert } from './email-alert.js';

async function sendTestEmail() {
  try {
    console.log('📧 Sending test email...');
    
    const result = await sendEmailAlert(
      'Test Email',
      'This is a test email to confirm the R2 usage monitoring system is working correctly. You will receive alerts when approaching storage limits.'
    );
    
    console.log('✅ Test email data prepared:', result);
    console.log('💡 To actually send emails, integrate with an email service like SendGrid or Mailgun');
    
  } catch (error) {
    console.error('❌ Error sending test email:', error);
  }
}

sendTestEmail(); 
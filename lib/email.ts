// lib/email.ts
import { Resend } from "resend";

// Lazy singleton: constructing Resend at module scope throws during
// `next build` prerender when RESEND_API_KEY isn't set (e.g. Docker build).
// Building it on first use keeps build-time imports side-effect free.
let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}
const DEBUG_EMAIL = process.env.NODE_ENV === 'development';
const SEND_EMAILS = () => process.env.SEND_EMAILS === 'true';
function getFromEmail(): string {
  return process.env.EMAIL_FROM || "Myanify <onboarding@resend.dev>";
}

// Shared email styles matching your design system
const emailStyles = `
  /* Reset & Base */
  body, html {
    margin: 0;
    padding: 0;
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #ffffff;
    color: #1a1a1a;
    -webkit-font-smoothing: antialiased;
  }
  
  .container {
    max-width: 560px;
    margin: 0 auto;
    padding: 40px 24px;
    background: #ffffff;
  }
  
  /* Header with gradient - using your brand colors */
  .header {
    background: linear-gradient(135deg, #ff0000 0%, #ff5900 100%);
    padding: 40px 32px;
    border-radius: 12px 12px 0 0;
    text-align: center;
    color: white;
  }
  
  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.5px;
  }
  
  .header p {
    margin: 8px 0 0 0;
    font-size: 16px;
    opacity: 0.9;
    font-weight: 400;
  }
  
  /* Content card */
  .content {
    background: #fafafa;
    padding: 32px;
    border-radius: 0 0 12px 12px;
    border: 1px solid #f0f0f0;
    border-top: none;
  }
  
  .content h2 {
    color: #1a1a1a;
    margin-top: 0;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.3px;
  }
  
  .content p {
    color: #4a4a4a;
    line-height: 1.7;
    font-size: 15px;
    margin: 16px 0;
  }
  
  /* Button - matching your button component */
  .btn {
    display: inline-block;
    background: #ff0000;
    color: #ffffff !important;
    padding: 12px 32px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 15px;
    text-decoration: none;
    transition: background 0.2s;
    text-align: center;
  }
  
  .btn:hover {
    background: #cc0000;
  }
  
  .btn-container {
    text-align: center;
    margin: 32px 0 24px 0;
  }
  
  /* Muted text */
  .muted {
    color: #888888;
    font-size: 13px;
    text-align: center;
    margin: 20px 0 0 0;
  }
  
  .muted a {
    color: #ff0000;
    text-decoration: none;
  }
  
  .muted a:hover {
    text-decoration: underline;
  }
  
  /* Divider */
  .divider {
    border: none;
    border-top: 1px solid #e8e8e8;
    margin: 24px 0;
  }
  
  /* Footer */
  .footer {
    text-align: center;
    color: #999999;
    font-size: 12px;
    margin-top: 24px;
  }
  
  .footer a {
    color: #ff0000;
    text-decoration: none;
  }
  
  /* Badge - matching your auth page badges */
  .badge {
    display: inline-block;
    background: rgba(255, 0, 0, 0.08);
    color: #ff0000;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }
  
  /* Responsive */
  @media (max-width: 480px) {
    .container {
      padding: 20px 16px;
    }
    .header {
      padding: 32px 20px;
    }
    .header h1 {
      font-size: 24px;
    }
    .content {
      padding: 24px 20px;
    }
    .content h2 {
      font-size: 20px;
    }
    .btn {
      padding: 14px 24px;
      font-size: 14px;
      width: 100%;
      box-sizing: border-box;
    }
  }
`;

function getEmailTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Myanify Email</title>
        <style>${emailStyles}</style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>🎵 Myanify</h1>
            <p>Myanmar Music Streaming</p>
          </div>
          
          <!-- Content -->
          <div class="content">
            ${content}
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

  if (DEBUG_EMAIL) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 VERIFICATION EMAIL (DEBUG MODE):');
    console.log(`   To: ${email}`);
    console.log(`   Link: ${verifyUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  if (!DEBUG_EMAIL || SEND_EMAILS()) {
    try {
      await getResend().emails.send({
        from: getFromEmail(),
        to: email,
        subject: "Verify your Myanify account",
        html: getEmailTemplate(`
          <h2>Welcome to Myanify! 🎵</h2>
          
          <p>
            Thanks for signing up! Please verify your email address to start streaming 
            thousands of Myanmar songs with synchronized lyrics.
          </p>
          
          <div class="btn-container">
            <a href="${verifyUrl}" class="btn">Verify Email Address</a>
          </div>
          
          <p style="font-size: 14px; color: #666; text-align: center;">
            <span class="badge">⏰ 24 hours</span>
          </p>
          
          <p class="muted">
            This link will expire in 24 hours. If you didn't create an account, 
            you can safely ignore this email.
          </p>
          
          <hr class="divider">
          
          <div class="footer">
            Myanify • Your Gateway to Myanmar Music<br>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}">
              ${process.env.NEXT_PUBLIC_APP_URL}
            </a>
          </div>
        `),
      });

      if (DEBUG_EMAIL) {
        console.log('✅ Email sent successfully');
      }
    } catch (error) {
      console.error('❌ Failed to send email:', error);
    }
  } else {
    console.log('ℹ️ Email sending disabled (set SEND_EMAILS=true to enable)');
  }
}

export async function sendResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  if (DEBUG_EMAIL) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 PASSWORD RESET EMAIL (DEBUG MODE):');
    console.log(`   To: ${email}`);
    console.log(`   Link: ${resetUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  if (!DEBUG_EMAIL || SEND_EMAILS()) {
    try {
      await getResend().emails.send({
        from: getFromEmail(),
        to: email,
        subject: "Reset your Myanify password",
        html: getEmailTemplate(`
          <h2>Reset Your Password 🔐</h2>
          
          <p>
            We received a request to reset your Myanify account password. 
            Click the button below to create a new password.
          </p>
          
          <div class="btn-container">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </div>
          
          <p style="font-size: 14px; color: #666; text-align: center;">
            <span class="badge">⏰ 1 hour</span>
          </p>
          
          <p class="muted">
            This link will expire in 1 hour. If you didn't request this, 
            you can safely ignore this email.
          </p>
          
          <hr class="divider">
          
          <div class="footer">
            Myanify • Your Gateway to Myanmar Music
          </div>
        `),
      });

      if (DEBUG_EMAIL) {
        console.log('✅ Password reset email sent successfully');
      }
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
    }
  } else {
    console.log('ℹ️ Email sending disabled (set SEND_EMAILS=true to enable)');
  }
}
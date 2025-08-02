import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/database";
import { SignUpInput, SignInInput } from "../types/auth";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "7d";
const SESSION_EXPIRES_DAYS = 7;
const PASSWORD_RESET_EXPIRES = "15m";

const userSelectFields = {
  user_id: true,
  email: true,
  name: true,
  subscription_type: true,
  birth_date: true,
  ai_requests_count: true,
  ai_requests_reset_at: true,
  created_at: true,
  email_verified: true,
  is_questionnaire_completed: true,
};

function generatePasswordResetToken(email: string) {
  return jwt.sign(
    {
      email,
      type: "password_reset",
      timestamp: Date.now(), // Add timestamp for extra security
    },
    JWT_SECRET,
    { expiresIn: PASSWORD_RESET_EXPIRES }
  );
}

function verifyPasswordResetToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      email: string;
      type: string;
      timestamp: number;
    };

    if (decoded.type !== "password_reset") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired password reset token");
  }
}

function generateToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function getSessionExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_EXPIRES_DAYS);
  return date;
}

export class AuthService {
  static async signUp(data: SignUpInput) {
    const { email, name, password, birth_date } = data;

    const existingUser = await prisma.user.findFirst({
      where: { email },
      select: {
        email_verified: true,
        email: true,
        name: true,
      },
    });

    if (existingUser) {
      if (existingUser.email_verified) {
        throw new Error(
          "Email already registered and verified. Please sign in instead."
        );
      } else {
        // User exists but email not verified - resend verification code
        const emailVerificationCode = crypto
          .randomInt(100000, 999999)
          .toString();

        await prisma.user.update({
          where: { email },
          data: {
            email_verification_code: emailVerificationCode,
            email_verification_expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          },
        });

        await this.sendVerificationEmail(
          email,
          emailVerificationCode,
          existingUser.name || name
        );

        return {
          user: { email, name: existingUser.name || name },
          needsEmailVerification: true,
        };
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const emailVerificationCode = crypto.randomInt(100000, 999999).toString();

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password_hash: hashedPassword,
        subscription_type: "FREE",
        birth_date: new Date(),
        ai_requests_count: 0,
        ai_requests_reset_at: new Date(),
        email_verified: false,
        email_verification_code: emailVerificationCode,
        email_verification_expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
      select: {
        ...userSelectFields,
        email_verified: true,
        email_verification_code: true,
      },
    });

    // Send verification email
    await this.sendVerificationEmail(email, emailVerificationCode, name);

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Created user:", user);
    }

    // Don't include sensitive data in response
    const { email_verification_code, ...userResponse } = user;
    return { user: userResponse, needsEmailVerification: true };
  }

  static async sendVerificationEmail(
    email: string,
    code: string,
    name: string
  ) {
    try {
      console.log("📧 EMAIL_USER:", process.env.EMAIL_USER);
      console.log();
      console.log("🔑 EMAIL_PASSWORD value:", process.env.EMAIL_PASSWORD); // Temporary debug
      const nodemailer = require("nodemailer");

      // Create transporter with correct method name
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      // Test the connection
      console.log("🔍 Testing email connection...");
      await transporter.verify();
      console.log("✅ Email connection verified", transporter);

      const mailOptions = {
        from: `"Calo Fitness & Diet" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verify Your Email Address - Calo",
        html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification - Calo</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            
            <!-- Main Container -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
              
              <!-- Header Section -->
              <tr>
                <td style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); padding: 40px 32px; text-align: center;">
                  <div style="background-color: rgba(255, 255, 255, 0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; border: 3px solid rgba(255, 255, 255, 0.2);">
                    <div style="width: 40px; height: 40px; background-color: white; border-radius: 50%; position: relative;">
                      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); border-radius: 50%;"></div>
                    </div>
                  </div>
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Calo</h1>
                  <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 8px 0 0 0; font-weight: 400;">Fitness & Diet</p>
                </td>
              </tr>
              
              <!-- Content Section -->
              <tr>
                <td style="padding: 48px 32px 32px;">
                  
                  <!-- Greeting -->
                  <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 24px 0; line-height: 1.3;">
                    Welcome, ${name}! 👋
                  </h2>
                  
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                    Thank you for joining Calo! We're excited to help you on your fitness and nutrition journey. To get started, please verify your email address using the code below.
                  </p>
                  
                  <!-- Verification Code Container -->
                  <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border: 2px dashed #cbd5e0; border-radius: 12px; padding: 32px; text-align: center; margin: 32px 0;">
                    <p style="color: #4a5568; font-size: 14px; margin: 0 0 16px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                      Verification Code
                    </p>
                    <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #2d3748; letter-spacing: 8px; margin: 16px 0; text-align: center;">
                      ${code}
                    </div>
                    <p style="color: #718096; font-size: 13px; margin: 16px 0 0 0;">
                      This code expires in <strong>15 minutes</strong>
                    </p>
                  </div>
                  
                  <!-- Instructions -->
                  <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 32px 0; border-radius: 0 8px 8px 0;">
                    <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                      📱 What's next?
                    </h3>
                    <p style="color: #1e40af; font-size: 14px; line-height: 1.5; margin: 0;">
                      Enter this code in the Calo app to verify your email and unlock all features including personalized meal plans, workout tracking, and progress analytics.
                    </p>
                  </div>
                  
                  <!-- Security Notice -->
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 32px 0; border-radius: 0 8px 8px 0;">
                    <h3 style="color: #dc2626; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                      🔒 Security Notice
                    </h3>
                    <p style="color: #dc2626; font-size: 14px; line-height: 1.5; margin: 0;">
                      If you didn't create an account with Calo, please ignore this email. Never share your verification code with anyone.
                    </p>
                  </div>
                  
                </td>
              </tr>
              
              <!-- Footer Section -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                  
                  <!-- Social Links -->
                  <div style="margin-bottom: 24px;">
                    <a href="#" style="display: inline-block; margin: 0 8px; width: 40px; height: 40px; background-color: #4ECDC4; border-radius: 50%; text-decoration: none; line-height: 40px; color: white; font-size: 16px;">📧</a>
                    <a href="#" style="display: inline-block; margin: 0 8px; width: 40px; height: 40px; background-color: #4ECDC4; border-radius: 50%; text-decoration: none; line-height: 40px; color: white; font-size: 16px;">💬</a>
                    <a href="#" style="display: inline-block; margin: 0 8px; width: 40px; height: 40px; background-color: #4ECDC4; border-radius: 50%; text-decoration: none; line-height: 40px; color: white; font-size: 16px;">🌐</a>
                  </div>
                  
                  <!-- Company Info -->
                  <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                    Calo - Fitness & Diet
                  </p>
                  <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">
                    Your Personal Nutrition & Fitness Assistant<br>
                    Transform your health, one meal at a time.
                  </p>
                  
                  <!-- Links -->
                  <div style="margin: 24px 0;">
                    <a href="#" style="color: #4ECDC4; text-decoration: none; font-size: 14px; margin: 0 16px; font-weight: 500;">Privacy Policy</a>
                    <a href="#" style="color: #4ECDC4; text-decoration: none; font-size: 14px; margin: 0 16px; font-weight: 500;">Terms of Service</a>
                    <a href="#" style="color: #4ECDC4; text-decoration: none; font-size: 14px; margin: 0 16px; font-weight: 500;">Support</a>
                  </div>
                  
                  <!-- Copyright -->
                  <p style="color: #a0aec0; font-size: 12px; margin: 20px 0 0 0;">
                    © 2025 Calo. All rights reserved.<br>
                    <a href="#" style="color: #a0aec0; text-decoration: none;">Unsubscribe</a> | 
                    <a href="#" style="color: #a0aec0; text-decoration: none;">Update Preferences</a>
                  </p>
                  
                </td>
              </tr>
              
            </table>
            
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}`);
      console.log("📧 Message ID:", result.messageId);

      // Still log to console for development
      if (process.env.NODE_ENV !== "production") {
        console.log(`📧 Verification email for ${email}`);
        console.log(`👤 Name: ${name}`);
        console.log(`🔑 Verification Code: ${code}`);
        console.log(`⏰ Code expires in 15 minutes`);
      }

      return true;
    } catch (error: any) {
      console.error("❌ Failed to send verification email:", error, { email });

      // More detailed error logging
      if (error.code === "EAUTH") {
        console.error(
          "🔐 Authentication failed - check your email credentials"
        );
      } else if (error.code === "ECONNECTION") {
        console.error("🌐 Connection failed - check your internet connection");
      }

      // Fallback to console logging if email fails
      console.log(`📧 FALLBACK - Verification email for ${email}`);
      console.log(`👤 Name: ${name}`);
      console.log(`🔑 Verification Code: ${code}`);
      console.log(`⏰ Code expires in 15 minutes`);

      // Don't throw error - let the signup continue even if email fails
      return true;
    }
  }

  static async verifyEmail(email: string, code: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        ...userSelectFields,
        email_verified: true,
        email_verification_code: true,
        email_verification_expires: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.email_verified) {
      throw new Error("Email already verified");
    }

    if (
      !user.email_verification_expires ||
      user.email_verification_expires < new Date()
    ) {
      throw new Error("Verification code expired");
    }

    if (user.email_verification_code !== code) {
      throw new Error("Invalid verification code");
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        email_verified: true,
        email_verification_code: null,
        email_verification_expires: null,
      },
      select: userSelectFields,
    });

    const token = generateToken({
      user_id: updatedUser.user_id,
      email: updatedUser.email,
    });

    await prisma.session.create({
      data: {
        user_id: updatedUser.user_id,
        token,
        expiresAt: getSessionExpiryDate(),
      },
    });

    return { user: updatedUser, token };
  }

  static async signIn(data: SignInInput) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Invalid email or password");

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new Error("Invalid email or password");

    const token = generateToken({ user_id: user.user_id, email: user.email });

    await prisma.session.create({
      data: {
        user_id: user.user_id,
        token,
        expiresAt: getSessionExpiryDate(),
      },
    });

    const { password_hash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        user_id: string;
        email: string;
      };

      if (
        !decoded ||
        typeof decoded !== "object" ||
        !("user_id" in decoded) ||
        !("email" in decoded)
      ) {
        throw new Error("Invalid token payload");
      }

      const session = await prisma.session.findUnique({
        where: { token },
        include: {
          user: { select: userSelectFields },
        },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new Error("Session expired");
      }

      return session.user;
    } catch {
      throw new Error("Invalid token");
    }
  }

  static async signOut(token: string) {
    await prisma.session.deleteMany({ where: { token } });
  }
  static async sendPasswordResetEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        user_id: true,
        email: true,
        name: true,
        email_verified: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
      // Generate verification code instead of token
      const resetCode = crypto.randomInt(100000, 999999).toString();
      
      // Store code in database
      await prisma.user.update({
        where: { email },
        data: {
          email_verification_code: resetCode,
          email_verification_expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });
      
      // Send code via email
      await this.sendPasswordResetCodeEmail(email, resetCode);

    if (!user.email_verified) {
      throw new Error("Please verify your email address first");
    }

    // Generate JWT token for password reset (this was missing!)
    const resetToken = generatePasswordResetToken(email);

    // Generate 6-digit verification code (if you want to keep the code approach)
    const resetCode = crypto.randomInt(100000, 999999).toString();

    // Store the code in the database with expiry
    await prisma.user.update({
      where: { email },
      data: {
        email_verification_code: resetCode,
        email_verification_expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes to match JWT expiry
      },
    });

    try {
      const nodemailer = require("nodemailer");

      const transporter = nodemailer.createTransporter({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: `"Calo Fitness & Diet" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Reset Your Password - Calo",
        html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Calo</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              
              <!-- Main Container -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
                
                <!-- Header Section -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); padding: 40px 32px; text-align: center;">
                    <div style="background-color: rgba(255, 255, 255, 0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; border: 3px solid rgba(255, 255, 255, 0.2);">
                      <div style="width: 40px; height: 40px; background-color: white; border-radius: 50%; position: relative;">
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); border-radius: 50%;"></div>
                      </div>
                    </div>
                    <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Calo</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 8px 0 0 0; font-weight: 400;">Fitness & Diet</p>
                  </td>
                </tr>
                
                <!-- Content Section -->
                <tr>
                  <td style="padding: 48px 32px 32px;">
                    
                    <!-- Greeting -->
                    <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 24px 0; line-height: 1.3;">
                      Password Reset Request 🔒
                    </h2>
                    
                    <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                      Hi ${user.name || "there"},<br><br>
                      We received a request to reset your password for your Calo account. Click the button below to reset your password securely.
                    </p>
                    
                    <!-- Reset Button -->
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${
                        process.env.FRONTEND_URL
                      }/reset-password?token=${resetToken}" 
                         style="display: inline-block; background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Reset My Password
                      </a>
                    </div>
                    
                    <p style="color: #718096; font-size: 14px; text-align: center; margin: 16px 0;">
                      Or copy this link: <br>
                      <span style="font-family: monospace; background: #f7fafc; padding: 4px 8px; border-radius: 4px; word-break: break-all;">
                        ${
                          process.env.FRONTEND_URL
                        }/reset-password?token=${resetToken}
                      </span>
                    </p>
                    
                    <!-- Instructions -->
                    <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 32px 0; border-radius: 0 8px 8px 0;">
                      <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                        📱 What happens next?
                      </h3>
                      <p style="color: #1e40af; font-size: 14px; line-height: 1.5; margin: 0;">
                        Click the link above to go to a secure page where you can create a new password. This link expires in 15 minutes for your security.
                      </p>
                    </div>
                    
                    <!-- Security Notice -->
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 32px 0; border-radius: 0 8px 8px 0;">
                      <h3 style="color: #dc2626; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                        ⚠️ Security Notice
                      </h3>
                      <p style="color: #dc2626; font-size: 14px; line-height: 1.5; margin: 0;">
                        If you didn't request a password reset, please ignore this email. Your password will remain unchanged. Never share this reset link with anyone.
                      </p>
                    </div>
                    
                  </td>
                </tr>
                
                <!-- Footer Section -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                      Calo - Fitness & Diet
                    </p>
                    <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">
                      Your Personal Nutrition & Fitness Assistant
                    </p>
                    <p style="color: #a0aec0; font-size: 12px; margin: 20px 0 0 0;">
                      © 2025 Calo. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
        </table>
      </body>
      </html>
      `,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset code sent to ${email}`);
      console.log("📧 Message ID:", result.messageId);

      // Log to console for development
      if (process.env.NODE_ENV !== "production") {
        console.log(`📧 Password reset code for ${email}`);
        console.log(`👤 Name: ${user.name}`);
        console.log(`🔑 Reset Code: ${resetCode}`);
        console.log(`⏰ Code expires in 15 minutes`);
      }

      return true;
    } catch (error: any) {
      console.error("❌ Failed to send password reset code:", error, {
        email,
      });

      // Fallback to console logging if email fails
      console.log(`📧 FALLBACK - Password reset code for ${email}`);
      console.log(`👤 Name: ${user.name}`);
      console.log(`🔑 Reset Code: ${resetCode}`);
      console.log(`⏰ Code expires in 15 minutes`);

      return true;
    }
  }
  
  static async verifyResetCode(email: string, code: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        user_id: true,
        email: true,
        email_verified: true,
        email_verification_code: true,
        email_verification_expires: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.email_verified) {
      throw new Error("Please verify your email address first");
    }

    if (
      !user.email_verification_expires ||
      user.email_verification_expires < new Date()
    ) {
      throw new Error("Verification code expired");
    }

    if (user.email_verification_code !== code) {
      throw new Error("Invalid verification code");
    }

    // Generate JWT token for password reset
    const resetToken = generatePasswordResetToken(email);

    // Clear the verification code
    await prisma.user.update({
      where: { email },
      data: {
        email_verification_code: null,
        email_verification_expires: null,
      },
    });

    return { token: resetToken };
  }

  static async resetPassword(token: string, newPassword: string) {
    // Verify the JWT token
    const decoded = verifyPasswordResetToken(token);
    const email = decoded.email;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        user_id: true,
        email: true,
        email_verified: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.email_verified) {
      throw new Error("Please verify your email address first");
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { email },
      data: {
        password_hash: hashedPassword,
      },
    });

    // Invalidate all existing sessions for security
    await prisma.session.deleteMany({
      where: { user_id: user.user_id },
    });

    console.log(`✅ Password reset successful for ${email}`);
    return true;
  }

  // Add method to verify token validity (for frontend validation)
  static async verifyPasswordResetToken(token: string) {
    try {
      const decoded = verifyPasswordResetToken(token);

      // Optional: Check if user still exists
      const user = await prisma.user.findUnique({
        where: { email: decoded.email },
        select: { email: true, email_verified: true },
      });

      if (!user || !user.email_verified) {
        throw new Error("User not found or email not verified");
      }
        message: "Password reset code sent successfully",
      return { valid: true, email: decoded.email };
    } catch (error) {
      return {
          error: "Failed to send password reset code",
        error: error instanceof Error ? error.message : "Invalid token",
      };
    }
  }
  static async getRolePermissions(role: string) {
    const permissions = {
      FREE: { dailyRequests: 10 },
      PREMIUM: { dailyRequests: 50 },
      GOLD: { dailyRequests: -1 },
    };

    return permissions[role as keyof typeof permissions] ?? permissions.FREE;
  }

  static async sendPasswordResetCodeEmail(email: string, resetCode: string) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      path: "/",
    };
      const transporter = nodemailer.createTransport({
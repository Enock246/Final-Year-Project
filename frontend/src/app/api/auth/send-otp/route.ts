import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import nodemailer from 'nodemailer';
import { z } from 'zod';

// Security Review: Strict input validation schema
const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  try {
    // 1. Validate Input (Security Review)
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parseResult = sendOtpSchema.safeParse(body);
    if (!parseResult.success) {
      // Redact detailed Zod errors and return generic validation error
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const { email } = parseResult.data;

    const supabaseAdmin = createAdminClient();

    // 2. Rate Limiting (max 3 requests per minute)
    const { data: isAllowed, error: rateLimitError } = await supabaseAdmin.rpc('check_otp_rate_limit', {
      user_email: email,
      max_requests: 3,
      window_minutes: 1
    });

    if (rateLimitError) {
      console.error('Rate limit checking error DETAILS:', rateLimitError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'Too many requests. Please wait a minute before trying again.' }, { status: 429 });
    }

    // 3. Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    // 4. Generate a 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 5. Store securely via Admin client
    const { error: dbError } = await supabaseAdmin
      .from('email_otps')
      .insert({ email, otp });

    if (dbError) {
      console.error('Database error storing OTP DETAILS:', dbError);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    // 6. Send email using Nodemailer (Gmail App Password)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      try {
        await transporter.sendMail({
          from: `"InternConnect" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: 'Your InternConnect Verification Code',
          html: `
            <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
              <h2>Confirm your email address</h2>
              <p>Welcome to InternConnect! Please use the following 6-digit code to verify your email address and finish signing up:</p>
              <div style="letter-spacing: 0.25em; padding: 24px; background-color: #f4f4f5; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; margin: 32px 0;">
                ${otp}
              </div>
              <p style="color: #666; font-size: 14px;">This code will expire shortly.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Nodemailer sending error:', emailError);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
    } else {
      console.warn('GMAIL_USER or GMAIL_APP_PASSWORD not configured. Falling back to console log.');
      console.log('\n=============================================');
      console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
      console.log('=============================================\n');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    // 7. Generic Error Fallback (Security Review: No stack traces)
    console.error('Unexpected error in /api/auth/send-otp (Redacted details for security)');
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again later.' }, { status: 500 });
  }
}

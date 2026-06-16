import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate a 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Supabase
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from('email_otps')
      .insert({ email, otp });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    // Send email using Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { error: emailError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Your InternConnect Verification Code',
      html: `
        <h2>Confirm your email address</h2>
        <p>Welcome to InternConnect! Please use the following 6-digit code to verify your email address and finish signing up:</p>
        <h1 style="letter-spacing: 0.25em; padding: 20px; background-color: #f4f4f5; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold;">${otp}</h1>
      `,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

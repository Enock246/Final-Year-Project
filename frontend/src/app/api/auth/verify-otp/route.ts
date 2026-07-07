import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { z } from 'zod';

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 characters'),
});

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parseResult = verifyOtpSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid email or OTP format' }, { status: 400 });
    }

    const { email, otp } = parseResult.data;

    const supabaseAdmin = createAdminClient();

    // Rate Limiting (max 5 requests per 5 minutes to prevent brute forcing)
    const { data: isAllowed, error: rateLimitError } = await supabaseAdmin.rpc('check_otp_rate_limit', {
      user_email: email,
      max_requests: 5,
      window_minutes: 5
    });

    if (rateLimitError) {
      console.error('Rate limit checking error (Redacted)');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'Too many verification attempts. Please wait 5 minutes.' }, { status: 429 });
    }
    
    // Check if the OTP is valid and not expired securely via Admin Client
    const { data, error } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Database error verifying OTP (Redacted)');
      return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Delete the used OTP securely
    await supabaseAdmin
      .from('email_otps')
      .delete()
      .eq('id', data[0].id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in /api/auth/verify-otp (Redacted)');
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again later.' }, { status: 500 });
  }
}

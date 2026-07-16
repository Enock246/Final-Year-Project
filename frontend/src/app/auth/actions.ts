'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { headers } from 'next/headers';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  captchaToken: z.string().optional(),
});

async function verifyCaptcha(token: string) {
  // In production, replace with real verification logic
  return token === 'dev_test_token' || token.length > 20;
}

export async function signInWithProtection(formData: FormData) {
  const result = schema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { error: 'Invalid input' };
  }

  const { email, password, captchaToken } = result.data;
  const supabase = await createClient();

  const { data: countData } = await supabase.rpc('get_failed_login_count', { user_email: email });
  const failedCount = countData || 0;

  if (failedCount >= 3) {
    if (!captchaToken || !(await verifyCaptcha(captchaToken))) {
      return { error: 'captcha_required' };
    }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await supabase.rpc('increment_failed_login', { user_email: email });
    return { error: error.message || 'Invalid credentials' };
  }

  await supabase.rpc('reset_failed_login', { user_email: email });
  
  // Determine where the user left off
  const { data: { user } } = await supabase.auth.getUser();
  let nextRoute = '/dashboard';

  return { success: true, nextRoute };
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function confirmUserAccount(code: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error) {
    return { error: error.message };
  }
  
  return { success: true };
}

export async function rejectUserAccount(code: string) {
  const supabase = await createClient();
  
  // We need to exchange the code to get the user context so we know who to delete
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error || !data.user) {
    return { error: 'Invalid verification link' };
  }
  
  const userId = data.user.id;
  
  // Sign them out since exchangeCodeForSession just logged them in
  await supabase.auth.signOut();
  
  // Use admin client to delete the user
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
  
  if (deleteError) {
    console.error('Failed to delete rejected user', deleteError);
    return { error: 'Failed to complete rejection process' };
  }
  
  return { success: true };
}

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function sendPasswordResetEmail(formData: FormData) {
  const result = forgotPasswordSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { error: 'Invalid email address' };
  }

  const { email } = result.data;
  const supabaseAdmin = createAdminClient();

  // 1. Verify user exists
  const { data: existingUser } = await supabaseAdmin
    .from('students')
    .select('id, full_name')
    .eq('email', email)
    .single();

  if (!existingUser) {
    // Return success anyway to prevent email enumeration attacks
    return { success: true };
  }

  // 2. Generate a 6-digit code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Store securely via Admin client in email_otps
  const { error: dbError } = await supabaseAdmin
    .from('email_otps')
    .insert({ email, otp });

  if (dbError) {
    console.error('Database error storing OTP');
    return { error: 'Failed to generate code. Please try again later.' };
  }

  const firstName = existingUser.full_name ? existingUser.full_name.split(' ')[0] : 'there';

  // 4. Send via Nodemailer
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
        from: `"InternAid" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Your Password Reset Code',
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
            <h2>Password Reset Request</h2>
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your password for your InternAid account. Please use the following 6-digit code to choose a new password:</p>
            <div style="letter-spacing: 0.25em; padding: 24px; background-color: #f4f4f5; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; margin: 32px 0;">
              ${otp}
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email. This code will expire in 15 minutes.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Nodemailer sending error', emailError);
      return { error: 'Failed to send email. Please try again.' };
    }
  } else {
    console.warn('GMAIL_USER or GMAIL_APP_PASSWORD not configured. Falling back to console log.');
    console.log('\n=============================================');
    console.log(`[DEV MODE] Password Reset OTP for ${email}: ${otp}`);
    console.log('=============================================\n');
  }

  return { success: true };
}

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 characters'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function resetUserPassword(formData: FormData) {
  const result = resetPasswordSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { error: result.error.issues?.[0]?.message || 'Invalid input format' };
  }

  const { email, otp, newPassword } = result.data;
  const supabaseAdmin = createAdminClient();

  // 1. Verify OTP
  const { data: otpData, error: otpError } = await supabaseAdmin
    .from('email_otps')
    .select('*')
    .eq('email', email)
    .eq('otp', otp)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (otpError || !otpData || otpData.length === 0) {
    return { error: 'Invalid or expired reset code' };
  }

  // 2. Find user
  const { data: userData } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('email', email)
    .single();

  if (!userData) {
    return { error: 'User not found' };
  }

  // 3. Update password securely via Admin
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    userData.id,
    { password: newPassword }
  );

  if (updateError) {
    console.error('Password update failed', updateError);
    return { error: 'Failed to update password. Please try again.' };
  }

  // 4. Delete the used OTP securely
  await supabaseAdmin
    .from('email_otps')
    .delete()
    .eq('id', otpData[0].id);

  // 5. Automatically log them in with the new password
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email,
    password: newPassword,
  });

  return { success: true, nextRoute: '/dashboard' };
}

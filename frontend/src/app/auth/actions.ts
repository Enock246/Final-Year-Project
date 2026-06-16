'use server';

import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

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
  
  return { success: true };
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

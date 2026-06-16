'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateProfile(data: any) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized' };
  }

  // We do an upsert so we don't accidentally fail if the profile record doesn't exist yet
  const { error } = await supabase
    .from('student_profiles')
    .upsert({
      student_id: user.id,
      ...data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id' });

  if (error) {
    console.error('Error updating profile:', error);
    return { error: error.message };
  }

  return { success: true };
}

export async function completeProfile(data: any) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('student_profiles')
    .upsert({
      student_id: user.id,
      ...data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id' });

  if (error) {
    console.error('Error completing profile:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

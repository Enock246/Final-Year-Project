'use server';

import { createClient } from '@/utils/supabase/server';

export async function fetchDashboardMatches() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data: matches, error: matchesError } = await supabase
    .rpc('get_school_matches', { p_student_id: user.id });

  if (matchesError) {
    console.error('Error fetching matches:', matchesError);
    throw new Error('Failed to fetch matches');
  }

  // Also fetch the user profile for the dashboard header
  const { data: profile, error: profileError } = await supabase
    .from('students')
    .select('full_name')
    .eq('id', user.id)
    .single();

  return {
    matches: matches || [],
    profile: profile || null,
  };
}

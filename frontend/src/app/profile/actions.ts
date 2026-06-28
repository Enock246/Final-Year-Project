'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateProfile(data: any) {
  const supabase = await createClient();
  
  let user = null;
  try {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) return { error: 'Unauthorized' };
    user = data.user;
  } catch (err) {
    console.error("Action Supabase fetch error:", err);
    return { error: 'Network error verifying session' };
  }

  // Ensure the base students record exists to prevent FK errors
  const { error: studentErr } = await supabase
    .from('students')
    .upsert({
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || 'Student'
    }, { onConflict: 'id' });
    
  if (studentErr) {
    console.error('Failed to upsert base student record:', studentErr);
  }

  // Extract custom fields for location mapping
  const { region_name, district_name, latitude, longitude, ...profileData } = data;
  
  let finalLocation = null;
  let regionId = null;
  let districtId = null;

  // 1. Resolve Region ID
  if (region_name) {
    const { data: rData } = await supabase.from('regions').select('id').ilike('name', `%${region_name}%`).limit(1).maybeSingle();
    if (rData) regionId = rData.id;
  }

  // 2. Resolve District ID
  if (district_name) {
    const { data: dData } = await supabase.from('districts').select('id').ilike('name', `%${district_name}%`).limit(1).maybeSingle();
    if (dData) districtId = dData.id;
  }

  // 3. Resolve Location (Geocoding)
  if (latitude !== undefined && longitude !== undefined) {
    finalLocation = `POINT(${longitude} ${latitude})`;
  } else if (profileData.town_city && district_name && region_name) {
    try {
      const query = encodeURIComponent(`${profileData.town_city}, ${district_name}, ${region_name}, Ghana`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
        headers: { 'User-Agent': 'InternConnect-App/1.0' }
      });
      const geocode = await res.json();
      if (geocode && geocode.length > 0) {
        finalLocation = `POINT(${geocode[0].lon} ${geocode[0].lat})`;
      } else {
        // Ultimate fallback to Kumasi so the dashboard spatial queries don't fail completely
        finalLocation = `POINT(-1.6244 6.6666)`;
      }
    } catch (e) {
      console.error('Fallback geocode failed:', e);
      finalLocation = `POINT(-1.6244 6.6666)`;
    }
  }

  const upsertPayload: any = {
    student_id: user.id,
    ...profileData,
    updated_at: new Date().toISOString(),
  };

  if (regionId) upsertPayload.region_id = regionId;
  if (districtId) upsertPayload.district_id = districtId;
  if (finalLocation) upsertPayload.location = finalLocation;

  // We do an upsert so we don't accidentally fail if the profile record doesn't exist yet
  const { error } = await supabase
    .from('student_profiles')
    .upsert(upsertPayload, { onConflict: 'student_id' });

  if (error) {
    console.error('Error updating profile:', error);
    return { error: error.message };
  }

  return { success: true };
}

export async function completeProfile(data: any) {
  const supabase = await createClient();
  
  let user = null;
  try {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) return { error: 'Unauthorized' };
    user = data.user;
  } catch (err) {
    console.error("Action Supabase fetch error:", err);
    return { error: 'Network error verifying session' };
  }

  const { error: studentErr } = await supabase
    .from('students')
    .upsert({
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || 'Student'
    }, { onConflict: 'id' });

  if (studentErr) {
    console.error('Failed to upsert base student record:', studentErr);
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

'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// Security Review: Strict input validation schemas with .strip() to prevent Mass Assignment
const profileSchema = z.object({
  region_name: z.string().optional(),
  district_name: z.string().optional(),
  town_city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  university_programme: z.string().optional(),
  key_skills_and_offerings: z.array(z.string()).optional(),
  cv_file_path: z.string().optional(),
  placement_letter_path: z.string().optional(),
}).strip();

export async function updateProfile(rawData: any) {
  const supabase = await createClient();
  
  let user = null;
  try {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) return { error: 'Unauthorized' };
    user = data.user;
  } catch (err) {
    console.error("Action Supabase fetch error (Redacted)");
    return { error: 'Network error verifying session' };
  }

  // Validate Input
  const parseResult = profileSchema.safeParse(rawData);
  if (!parseResult.success) {
    console.error('Validation failed during profile update', parseResult.error);
    return { error: 'Invalid profile data provided' };
  }
  const data = parseResult.data;

  // Ensure the base students record exists to prevent FK errors
  const { error: studentErr } = await supabase
    .from('students')
    .upsert({
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || 'Student'
    }, { onConflict: 'id' });
    
  if (studentErr) {
    console.error('Failed to upsert base student record (Redacted)');
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
        headers: { 'User-Agent': 'InternAid-App/1.0' }
      });
      const geocode = await res.json();
      if (geocode && geocode.length > 0) {
        finalLocation = `POINT(${geocode[0].lon} ${geocode[0].lat})`;
      } else {
        // Ultimate fallback to Kumasi so the dashboard spatial queries don't fail completely
        finalLocation = `POINT(-1.6244 6.6666)`;
      }
    } catch (e) {
      console.error('Fallback geocode failed (Redacted)');
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
    console.error('Error updating profile (Redacted)');
    return { error: 'Failed to update profile' }; // Sanitized error
  }

  return { success: true };
}

export async function completeProfile(rawData: any) {
  const supabase = await createClient();
  
  let user = null;
  try {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) return { error: 'Unauthorized' };
    user = data.user;
  } catch (err) {
    console.error("Action Supabase fetch error (Redacted)");
    return { error: 'Network error verifying session' };
  }

  // Validate Input
  const parseResult = profileSchema.safeParse(rawData);
  if (!parseResult.success) {
    console.error('Validation failed during profile completion', parseResult.error);
    return { error: 'Invalid profile data provided' };
  }
  const data = parseResult.data;

  const { error: studentErr } = await supabase
    .from('students')
    .upsert({
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || 'Student'
    }, { onConflict: 'id' });

  if (studentErr) {
    console.error('Failed to upsert base student record (Redacted)');
  }
  
  // Exclude fields handled manually
  const { region_name, district_name, latitude, longitude, ...profileData } = data;

  const { error } = await supabase
    .from('student_profiles')
    .upsert({
      student_id: user.id,
      ...profileData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id' });

  if (error) {
    console.error('Error completing profile (Redacted)');
    return { error: 'Failed to complete profile' }; // Sanitized error
  }

  revalidatePath('/dashboard');
  return { success: true };
}

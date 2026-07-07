const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkApps() {
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name')
    .ilike('name', '%Prempeh%');
    
  if (!schools || schools.length === 0) {
    console.log("Prempeh College not found.");
    return;
  }
  
  const prempeh = schools[0];
  console.log(`Found School: ${prempeh.name}`);
  
  const { data: apps, error } = await supabase
    .from('applications')
    .select('id, student_id, status, created_at')
    .eq('school_id', prempeh.id)
    .order('created_at', { ascending: false });
    
  if (apps && apps.length > 0) {
    const student_id = apps[0].student_id;
    console.log(`Application's Student ID: ${student_id}`);
    
    // Call the RPC that the dashboard uses
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_active_applications_with_scores', { student_uuid: student_id });
    
    if (rpcError) {
      console.error('RPC Error:', rpcError);
    } else {
      console.log(`RPC returned ${rpcData.length} applications for this student.`);
      rpcData.forEach(app => console.log(`- RPC App: ${app.school_name} | Status: ${app.status}`));
    }
  }
}

checkApps();

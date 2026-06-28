import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1x1 transparent GIF base64 encoded
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get('id');

    if (!applicationId) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch the application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, status, student_id, schools(name)')
      .eq('id', applicationId)
      .single();

    if (!appError && application && application.status === 'PENDING') {
      // Update status to OPENED
      await supabase
        .from('applications')
        .update({ status: 'OPENED' })
        .eq('id', applicationId);

      // Create an inbox message for the student
      const schoolName = application.schools?.name || 'The school';
      await supabase.from('inbox_messages').insert([{
        student_id: application.student_id,
        application_id: application.id,
        type: 'APPLICATION_UPDATE',
        subject: `Update: ${schoolName} opened your application!`,
        content: `${schoolName} has just opened and read your application email. We will notify you if they reply.`,
        is_read: false
      }]);
      
      console.log(`[Open Tracker] Recorded OPENED for application: ${applicationId}`);
    }

    // Always return the invisible 1x1 GIF so the email client doesn't show a broken image
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[Open Tracker] Error:', error);
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: { 'Content-Type': 'image/gif' },
    });
  }
}

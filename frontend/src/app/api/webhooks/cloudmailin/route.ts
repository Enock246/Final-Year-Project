import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Cloudmailin normalized JSON structure
    const plainText = payload.plain || '';
    const htmlText = payload.html || '';
    const subject = payload.headers?.subject || 'Reply from School';
    
    // Extract sender
    const fromStr = payload.headers?.from || payload.envelope?.from || 'Unknown Sender';
    const cleanSender = fromStr.replace(/<.*?>/g, '').trim() || fromStr;

    // Search for our hidden [REF: uuid] anywhere in the email body
    const refRegex = /\[REF:\s*([a-f0-9\-]{36})\]/i;
    const match = plainText.match(refRegex) || htmlText.match(refRegex);

    if (!match || !match[1]) {
      console.warn('[Cloudmailin] No Application ID REF found in reply.');
      return NextResponse.json({ success: false, reason: 'No REF found' });
    }

    const applicationId = match[1];

    // Clean up the reply content (strip out the quoted previous email)
    // Gmail usually uses "On Thu, Jun 25, 2026, 4:47 PM Enock Yeboah <...>"
    // We split by any line that starts with "On " and contains an email address or "wrote:"
    // Using (?:^|\r?\n) to strictly require "On" to be at the start of a line.
    let cleanContent = plainText.split(/(?:^|\r?\n)\s*(?:On\s+(?:.|\r?\n){0,150}wrote:|From:\s+(?:.|\r?\n){0,150}Sent:)/i)[0].trim();
    if (!cleanContent) {
      cleanContent = plainText.trim();
    }
    
    // Sometimes people reply at the TOP, leaving the previous message below separated by >
    // Strip everything after the first sequence of `> ` blockquotes
    cleanContent = cleanContent.split(/(?:\r?\n)>\s/)[0].trim();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch application with school data
    const { data: appData, error: appError } = await supabase
      .from('applications')
      .select('id, student_id, status, schools(name)')
      .eq('id', applicationId)
      .single();

    if (appError || !appData) {
      console.error('[Cloudmailin] Application not found:', applicationId);
      return NextResponse.json({ success: false, reason: 'Application not found' });
    }

    const schoolName = appData.schools?.name || cleanSender;

    // Insert the reply into the Inbox Messages table
    const { error: insertError } = await supabase.from('inbox_messages').insert([
      {
        student_id: appData.student_id,
        application_id: applicationId,
        type: 'SCHOOL_REPLY',
        subject: `Re: ${subject}`,
        content: `Reply from ${schoolName}: ${cleanContent}`,
        is_read: false
      }
    ]);

    if (insertError) {
      console.error('[Cloudmailin] Failed to insert inbox message:', insertError);
      return NextResponse.json({ error: 'Failed to record message' }, { status: 500 });
    }

    // Update the application status to REPLIED
    await supabase
      .from('applications')
      .update({ status: 'REPLIED' })
      .eq('id', applicationId);

    console.log(`[Cloudmailin] Successfully processed reply for application: ${applicationId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Cloudmailin] Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

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

    const schoolData = appData.schools as any;
    const schoolName = (Array.isArray(schoolData) ? schoolData[0]?.name : schoolData?.name) || cleanSender;

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

    // Use Gemini to classify the reply
    let determinedStatus = 'REPLIED';
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are analyzing an email reply from a school headmaster to a university student requesting an internship/teaching placement.
Read the email below and classify it into EXACTLY ONE of the following three words:
- ACCEPTED (if they are accepting the student, telling them to report, or confirming the placement)
- REJECTED (if they are declining, saying there is no space, or saying they cannot accommodate the student)
- REPLIED (if they are just asking a follow-up question, saying they are reviewing it, or anything else that is not a final decision)

Reply with ONLY the single word (ACCEPTED, REJECTED, or REPLIED). Do not output any other text.

Email:
"${cleanContent}"`;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const result = aiResponse.text?.trim().toUpperCase() || '';
        if (['ACCEPTED', 'REJECTED', 'REPLIED'].includes(result)) {
          determinedStatus = result;
          console.log(`[Cloudmailin] AI determined status: ${determinedStatus}`);
        } else {
          console.warn(`[Cloudmailin] AI returned invalid status: ${result}. Defaulting to REPLIED.`);
        }
      } else {
        console.warn(`[Cloudmailin] No GEMINI_API_KEY. Defaulting status to REPLIED.`);
      }
    } catch (aiError) {
      console.error('[Cloudmailin] AI classification failed:', aiError);
      // Default to REPLIED if AI fails
    }

    // Update the application status
    await supabase
      .from('applications')
      .update({ status: determinedStatus })
      .eq('id', applicationId);

    console.log(`[Cloudmailin] Successfully processed reply for application: ${applicationId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Cloudmailin] Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

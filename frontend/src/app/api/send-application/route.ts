import { NextResponse } from 'next/server';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { createClient } from '@/utils/supabase/server';

const sendRequestSchema = z.object({
  student_id: z.string().uuid(),
  school_id: z.string().uuid(),
  student_email: z.string(),
  student_name: z.string(),
  school_email: z.string().optional().nullable(),
  school_name: z.string(),
  letter_content: z.string(),
  documents: z.array(z.object({
    name: z.string(),
    path: z.string()
  })),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Validate auth (ensure user is logged in)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[DEBUG] Incoming body:', body);
    
    let parsed;
    try {
      parsed = sendRequestSchema.parse(body);
    } catch (zError) {
      console.error('[DEBUG] Zod Error:', JSON.stringify(zError, null, 2));
      throw zError;
    }

    // Verify the user is sending their own application
    if (parsed.student_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized user action' }, { status: 403 });
    }

    // Check for existing application
    const { data: existingApps } = await supabase
      .from('applications')
      .select('id, status')
      .eq('student_id', parsed.student_id)
      .eq('school_id', parsed.school_id)
      .order('created_at', { ascending: false })
      .limit(1);
      
    const existingApp = existingApps && existingApps.length > 0 ? existingApps[0] : null;
      
    if (existingApp && ['PENDING', 'DELIVERED', 'OPENED', 'ACCEPTED'].includes(existingApp.status)) {
      return NextResponse.json({ error: 'You already have an active application to this school.' }, { status: 409 });
    }

    // Insert new application
    const { data: dbData, error: dbError } = await supabase
      .from('applications')
      .insert([
        {
          student_id: parsed.student_id,
          school_id: parsed.school_id,
          status: 'PENDING',
          final_letter: parsed.letter_content,
          documents_attached: parsed.documents.map(d => d.name),
        }
      ])
      .select();

    if (dbError || !dbData || dbData.length === 0) {
      console.error('Database insertion error:', dbError);
      return NextResponse.json({ error: 'Failed to record application' }, { status: 500 });
    }

    const application = dbData[0];

    // Create Initial Inbox Message (Congratulations)
    await supabase.from('inbox_messages').insert([{
      student_id: parsed.student_id,
      application_id: application.id,
      type: 'SYSTEM_ALERT',
      subject: `Application Sent to ${parsed.school_name}!`,
      content: `Your application to ${parsed.school_name} was successfully dispatched. We'll track it and notify you when they open your email! Expected response: Within 5-7 days.`,
      is_read: false
    }]);

    // Email dispatch via Nodemailer
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      // Simulate email sending if no credentials
      await new Promise(resolve => setTimeout(resolve, 2000));
      return NextResponse.json({ success: true, mocked: true, application });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // Download attachments from Supabase Storage
    const attachments = [];
    for (const doc of parsed.documents) {
      const { data: fileBlob, error: downloadError } = await supabase.storage.from('documents').download(doc.path);
      if (fileBlob && !downloadError) {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const rawFileName = doc.path.split('/').pop() || doc.name;
        const parts = rawFileName.split('_');
        const cleanName = parts.length >= 3 ? parts.slice(2).join('_') : rawFileName;

        // Ensure the filename has an extension (default to .pdf)
        let finalName = cleanName;
        if (!finalName.includes('.')) {
          finalName += '.pdf';
        }

        // Determine Content Type
        const ext = finalName.split('.').pop()?.toLowerCase();
        let contentType = "application/octet-stream";
        if (ext === 'pdf') contentType = "application/pdf";
        else if (ext === 'doc' || ext === 'docx') contentType = "application/msword";

        attachments.push({
          filename: finalName,
          content: buffer,
          contentType: contentType
        });
      }
    }

    // Generate tracking pixel URL
    // We use the ngrok URL (or production URL)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dreamlike-quiet-domestic.ngrok-free.dev";
    const trackingPixelUrl = `${baseUrl}/api/track-open?id=${application.id}`;

    // 1. Send the actual application to the school
    const schoolMailOptions = {
      from: `"${parsed.student_name} (via InternAid)" <${process.env.GMAIL_USER}>`,
      to: "yeboahenock213@gmail.com", // HARDCODED FOR TESTING
      replyTo: `"${parsed.student_name}" <${process.env.CLOUDMAILIN_ADDRESS}>`,
      subject: `New Internship Application from ${parsed.student_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Placement Application</h2>
          <p>You have received a new internship application from <strong>${parsed.student_name}</strong>.</p>
          <hr style="border: 1px solid #eaeaea; margin: 20px 0;" />
          <h3>Application Letter</h3>
          <div style="white-space: pre-wrap; color: #333; background: #f9f9f9; padding: 20px; border-radius: 8px;">${parsed.letter_content}</div>
          <hr style="border: 1px solid #eaeaea; margin: 20px 0;" />
          <p><strong>Attached Documents:</strong> ${parsed.documents.map(d => d.name).join(', ')}</p>
          <br><br>
          <div style="color: transparent; font-size: 1px;">[REF: ${application.id}]</div>
          <img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />
        </div>
      `,
      attachments: attachments
    };

    // 2. Send the confirmation receipt to the student
    const studentMailOptions = {
      from: `"AAMUSTED Internships" <${process.env.GMAIL_USER}>`,
      to: parsed.student_email,
      subject: `Application Sent: ${parsed.school_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #1a1a1a;">Application Successfully Sent</h2>
          <p>Hi ${parsed.student_name},</p>
          <p>Your application to <strong>${parsed.school_name}</strong> has been successfully delivered to their administrative inbox.</p>
          <p>You can track the status of your application and you will receive any updates directly in your InternAid dashboard.</p>
          <hr style="border: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="margin-bottom: 5px;"><strong>Documents Included in your application:</strong></p>
          <ul style="margin-top: 0; padding-left: 20px;">
            ${parsed.documents.map(d => `<li>${d.name}</li>`).join('')}
          </ul>
          <p style="font-size: 12px; color: #888; margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 15px;">
            This is an automated receipt. You do not need to reply to this email.
          </p>
        </div>
      `
    };

    try {
      await transporter.sendMail(schoolMailOptions);
      await transporter.sendMail(studentMailOptions);
      console.log('Nodemailer dispatched emails successfully');
    } catch (err) {
      console.error('Nodemailer dispatch error:', err);
    }

    return NextResponse.json({ success: true, application });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[DEBUG] Zod Validation Failed:', error.issues);
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    console.error('Error sending application:', error);
    return NextResponse.json({ error: 'Failed to send application' }, { status: 500 });
  }
}

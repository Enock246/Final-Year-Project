import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

const generateRequestSchema = z.object({
  studentProfile: z.object({
    full_name: z.string(),
    key_skills_and_offerings: z.array(z.string()).optional().nullable(),
  }),
  schoolDetails: z.object({
    name: z.string(),
    school_type: z.string().optional().nullable(),
    town_city: z.string().optional().nullable(),
  }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = generateRequestSchema.parse(body);

    const skills = parsed.studentProfile.key_skills_and_offerings?.length 
      ? parsed.studentProfile.key_skills_and_offerings.join(', ') 
      : 'education and youth development';

    // If no API key, return a mock letter to save developer time
    if (!process.env.GEMINI_API_KEY) {
      await new Promise(resolve => setTimeout(resolve, 4000)); // Simulate AI generation delay

      const mockLetter = `Dear Hiring Manager at ${parsed.schoolDetails.name},

I am writing to express my strong interest in completing my teaching placement at your esteemed institution in ${parsed.schoolDetails.town_city || 'your district'}. My name is ${parsed.studentProfile.full_name}, and I am passionate about contributing to your students' success.

With my background in ${skills}, I am confident I can make a meaningful impact inside and outside the classroom. I admire your school's commitment to academic excellence and would be honored to learn from your experienced faculty while applying my theoretical knowledge in a practical setting.

I would welcome the opportunity to discuss how my skills align with your school's goals. Thank you for considering my application.

Sincerely,
${parsed.studentProfile.full_name}`;

      return NextResponse.json({ letter: mockLetter });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `Write a highly concise, human-sounding application letter for a university student seeking a teaching placement (internship).
Student Name: ${parsed.studentProfile.full_name}
Skills/Offerings: ${skills}
Target School: ${parsed.schoolDetails.name}
School Location: ${parsed.schoolDetails.town_city || 'Ghana'}

Rules for the letter:
1. Sound completely human, natural, and humble. Do NOT use overly flowery AI language (e.g., "esteemed institution", "profound interest", "delve into").
2. Go straight to the point. Do not beat around the bush.
3. Be very concise (maximum 2-3 short paragraphs).
4. Center the entire letter strictly on the request to do an internship/teaching placement at their institution.
5. You MUST explicitly state that the student is studying at "Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development (AAMUSTED)".
6. Do NOT use bullet points. Keep it in natural paragraph form.
7. Do NOT include any placeholders for dates (like [Start Date] or [Address]). Output ONLY the raw letter text with a standard salutation and sign-off.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return NextResponse.json({ letter: response.text });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: (error as any).errors }, { status: 400 });
    }
    console.error('Error generating application:', error);
    return NextResponse.json({ error: 'Failed to generate application' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // The default redirect fallback is the home page
  // But for InternConnect, we redirect to /profile/location to continue onboarding
  const next = searchParams.get('next') ?? '/profile/location'

  if (code) {
    // Instead of exchanging the code here, we redirect to our intermediate verification page.
    // The verification page will ask the user "Are you trying to sign up?", and if they say Yes,
    // it will call a server action to exchange the code.
    const verifyUrl = new URL(`${origin}/auth/verify`)
    verifyUrl.searchParams.set('code', code)
    verifyUrl.searchParams.set('next', next)
    
    return NextResponse.redirect(verifyUrl)
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-error`)
}

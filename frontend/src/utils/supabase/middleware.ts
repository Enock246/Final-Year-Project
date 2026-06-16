import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isAuthRoute = url.pathname.startsWith('/auth')
  const isProtectedRoute = url.pathname.startsWith('/profile') || url.pathname.startsWith('/dashboard')

  // If user is not logged in and tries to access a protected route, redirect to signin
  if (!user && isProtectedRoute) {
    url.pathname = '/auth/signin'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // If user is logged in and tries to access an auth route, redirect to profile/dashboard
  if (user && isAuthRoute) {
    // If they are signing out via an API route, let them pass
    if (url.pathname === '/auth/signout') return supabaseResponse
    
    url.pathname = '/profile/location' // Default logged-in landing
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

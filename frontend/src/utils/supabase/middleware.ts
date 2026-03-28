import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig } from './config'

type CookieToSet = {
    name: string
    value: string
    options?: Parameters<NextResponse['cookies']['set']>[2]
}

// Map DB role enum values to dashboard routes
const ROLE_DASHBOARDS: Record<string, string> = {
    admin: '/admin/dashboard',
    flight_company: '/airline/dashboard',
    customer: '/user',
}

// Which route prefixes each role is allowed to access
const ROLE_ALLOWED_PREFIX: Record<string, string[]> = {
    admin: ['/admin'],
    flight_company: ['/airline'],
    customer: ['/user'],
}

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })
    const { url, anonKey } = getSupabaseConfig()

    const supabase = createServerClient(
        url,
        anonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: CookieToSet[]) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
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

    const pathname = request.nextUrl.pathname

    const isProtectedRoute =
        pathname.startsWith('/admin') ||
        pathname.startsWith('/airline') ||
        pathname.startsWith('/user')

    if (!user) {
        // Unauthenticated user hits a protected route → redirect to login
        if (isProtectedRoute) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        return supabaseResponse
    }

    // User is authenticated — fetch real role from DB
    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role as string | undefined

    if (!role) {
        // Profile not found — sign them out and redirect
        if (isProtectedRoute) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        return supabaseResponse
    }

    if (isProtectedRoute) {
        const allowed = ROLE_ALLOWED_PREFIX[role] || []
        const hasAccess = allowed.some((prefix) => pathname.startsWith(prefix))

        if (!hasAccess) {
            // Redirect to their correct dashboard instead of home page
            const correctDashboard = ROLE_DASHBOARDS[role] || '/'
            return NextResponse.redirect(new URL(correctDashboard, request.url))
        }
    }

    return supabaseResponse
}

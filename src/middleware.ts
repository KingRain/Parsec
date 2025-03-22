import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const githubToken = req.cookies.get('github_token')?.value;
  
  try {
    // Protected routes - redirect to home if not authenticated
    if (req.nextUrl.pathname.startsWith('/dashboard') && !githubToken) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    
    // Auth callback route - skip re-authentication if already logged in
    if (req.nextUrl.pathname === '/api/auth/callback' && githubToken) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    // Public routes (home, login) - redirect to dashboard if already authenticated
    if ((req.nextUrl.pathname === '/' || 
         req.nextUrl.pathname === '/login') && 
         githubToken) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware authentication error:', error);
    return NextResponse.redirect(new URL('/?error=auth_error', req.url));
  }
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/api/auth/callback'
  ]
}
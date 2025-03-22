import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const githubToken = req.cookies.get('github_token')?.value;
  
  if (req.nextUrl.pathname === '/api/auth/callback' && githubToken) {
    console.log("🔄 User already authenticated, redirecting to dashboard");
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/callback']
}
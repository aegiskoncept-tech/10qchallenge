import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt, AUTH_COOKIE_NAME } from './lib/auth/jwt';

export const config = {
  matcher: [
    '/admin/:path*',
    '/student/:path*',
    '/login',
    '/register',
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  const payload = token ? await verifyJwt(token) : null;
  const isAuthenticated = Boolean(payload);
  const isAdmin = payload?.role === 'ADMIN';

  // 1. Guard Admin Routes (/admin/*)
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated || !isAdmin) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      if (isAuthenticated && !isAdmin) {
        loginUrl.searchParams.set('error', 'forbidden');
      }
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Guard Student Routes (/student/*)
  if (pathname.startsWith('/student')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Guest redirect for Login and Register pages if already authenticated
  if (pathname === '/login' || pathname === '/register') {
    if (isAuthenticated) {
      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin', req.url));
      } else {
        return NextResponse.redirect(new URL('/student/dashboard', req.url));
      }
    }
  }

  return NextResponse.next();
}

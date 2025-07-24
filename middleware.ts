import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedPasswords = ['andrea123'];

export function middleware(request: NextRequest) {
  const cookie = request.cookies.get('beta-access')?.value;
  if (!allowedPasswords.includes(cookie || '')) {
    const url = request.nextUrl.clone();
    url.pathname = '/access-denied';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|unlock|access-denied).*)',
  ],
};
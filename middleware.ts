import { NextResponse } from 'next/server'

export function middleware(req: any) {
  const res = NextResponse.next()
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  return res
}

export const config = { matcher: ['/dashboard'] }

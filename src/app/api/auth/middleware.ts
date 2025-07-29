import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // 为所有 auth 相关路由添加安全头
  const response = NextResponse.next()
  
  // 设置 referrer-policy 为 no-referrer
  response.headers.set('Referrer-Policy', 'no-referrer')
  
  // 添加其他安全头
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // 防止缓存敏感信息
  if (request.nextUrl.pathname.includes('/auth/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
  }
  
  return response
}

export const config = {
  matcher: '/api/auth/:path*'
}
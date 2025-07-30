import { NextRequest, NextResponse } from 'next/server'

/**
 * 简化版本的 Amazon OAuth 回调处理
 * 用于故障排除和测试基本功能
 */
export async function GET(request: NextRequest) {
  console.log('🚀 Simple Amazon callback started')
  
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')
    const code = searchParams.get('spapi_oauth_code') || searchParams.get('code')
    const sellingPartnerId = searchParams.get('selling_partner_id')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    console.log('📥 Simple callback received:', {
      hasState: !!state,
      hasCode: !!code,
      hasSellingPartnerId: !!sellingPartnerId,
      error: error || 'none',
      timestamp: new Date().toISOString(),
      fullUrl: request.url
    })
    
    // 环境变量检查
    const envCheck = {
      hasClientId: !!process.env.AMAZON_LWA_CLIENT_ID,
      hasClientSecret: !!process.env.AMAZON_LWA_CLIENT_SECRET,
      hasRedirectUri: !!process.env.AMAZON_REDIRECT_URI,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV
    }
    
    console.log('🔧 Environment check:', envCheck)
    
    // 处理 Amazon 错误
    if (error) {
      console.error('❌ Amazon authorization error:', error, errorDescription)
      const baseUrl = process.env.NEXTAUTH_URL || 'https://listing-generation1.vercel.app'
      return NextResponse.redirect(`${baseUrl}/auth/error?error=${error}&description=${encodeURIComponent(errorDescription || '')}`)
    }
    
    // 检查必需参数
    if (!state || !code) {
      console.error('❌ Missing required parameters:', { hasState: !!state, hasCode: !!code })
      const baseUrl = process.env.NEXTAUTH_URL || 'https://listing-generation1.vercel.app'
      return NextResponse.redirect(`${baseUrl}/auth/error?error=missing_parameters&description=Missing state or code`)
    }
    
    // 测试 token 交换
    console.log('🔄 Testing token exchange...')
    try {
      const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.AMAZON_REDIRECT_URI || '',
          client_id: process.env.AMAZON_LWA_CLIENT_ID || '',
          client_secret: process.env.AMAZON_LWA_CLIENT_SECRET || ''
        }).toString()
      })
      
      console.log('📤 Token response:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        ok: tokenResponse.ok
      })
      
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        console.log('✅ Token exchange successful:', {
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          expiresIn: tokenData.expires_in
        })
        
        // 简单成功重定向
        const baseUrl = process.env.NEXTAUTH_URL || 'https://listing-generation1.vercel.app'
        const successUrl = `${baseUrl}/amazon-listing?success=true&seller_id=${encodeURIComponent(sellingPartnerId || '')}`
        
        console.log('🎉 Simple callback success, redirecting to:', successUrl)
        return NextResponse.redirect(successUrl)
        
      } else {
        const errorText = await tokenResponse.text()
        console.error('❌ Token exchange failed:', {
          status: tokenResponse.status,
          response: errorText
        })
        
        const baseUrl = process.env.NEXTAUTH_URL || 'https://listing-generation1.vercel.app'
        return NextResponse.redirect(`${baseUrl}/auth/error?error=token_exchange_failed&description=${encodeURIComponent(errorText)}`)
      }
      
    } catch (tokenError) {
      console.error('❌ Token exchange error:', tokenError)
      const baseUrl = process.env.NEXTAUTH_URL || 'https://listing-generation1.vercel.app'
      return NextResponse.redirect(`${baseUrl}/auth/error?error=token_exchange_error&description=${encodeURIComponent(tokenError instanceof Error ? tokenError.message : 'Unknown error')}`)
    }
    
  } catch (error) {
    console.error('💥 Simple callback fatal error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    
    // 返回 JSON 响应而不是重定向，以便看到具体错误
    return new NextResponse(JSON.stringify({
      error: 'simple_callback_error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
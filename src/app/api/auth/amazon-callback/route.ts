import { NextRequest, NextResponse } from 'next/server'
import { verifyStateToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sign } from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')
    // Amazon SP-API 使用 'spapi_oauth_code' 而不是标准的 'code'
    const code = searchParams.get('spapi_oauth_code') || searchParams.get('code')
    const sellingPartnerId = searchParams.get('selling_partner_id')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    // 调试日志
    console.log('Amazon callback received:', {
      state: state ? 'present' : 'missing',
      code: code ? 'present' : 'missing',
      spapi_oauth_code: searchParams.get('spapi_oauth_code') ? 'present' : 'missing',
      sellingPartnerId: sellingPartnerId || 'not provided',
      error: error || 'none',
      errorDescription: errorDescription || 'none',
      url: request.url
    })
    
    // 处理错误情况
    if (error) {
      console.error('Amazon authorization error:', error, errorDescription)
      return NextResponse.redirect(
        `/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`,
        { status: 302 }
      )
    }
    
    // 验证必要参数
    if (!state || !code) {
      return NextResponse.redirect(
        '/auth/error?error=missing_parameters&description=Missing required authorization parameters',
        { status: 302 }
      )
    }
    
    // 验证 state token
    let stateData = verifyStateToken(state)
    
    // 如果验证失败，可能是直接从 Amazon Seller Central 发起的授权
    if (!stateData) {
      console.log('State is not a JWT token, treating as direct authorization from Amazon:', {
        state: state?.substring(0, 10) + '...',
        sellingPartnerId
      })
      
      // 创建基本的 stateData 对象以继续处理
      stateData = {
        sellerId: sellingPartnerId || '',
        originalRedirectUri: process.env.DEFAULT_CALLBACK_URL || '/amazon-listing',
        timestamp: Date.now(),
        directAuth: true // 标记为直接授权
      }
    } else {
      console.log('State token validated successfully:', {
        sellerId: stateData.sellerId,
        timestamp: stateData.timestamp,
        originalRedirectUri: stateData.originalRedirectUri,
        directAuth: false
      })
    }
    
    // 使用授权码交换 tokens
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
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        console.error('Token exchange error:', errorData)
        throw new Error(errorData.error_description || 'Token exchange failed')
      }
      
      const tokenData = await tokenResponse.json()
      const { access_token, refresh_token, expires_in } = tokenData
      
      console.log('Token exchange successful:', {
        access_token: access_token ? 'received' : 'missing',
        refresh_token: refresh_token ? 'received' : 'missing',
        expires_in: expires_in || 'not provided',
        authSource: stateData.directAuth ? 'Amazon Seller Central' : 'Application'
      })
      
      // 获取用户信息
      const profileResponse = await fetch('https://api.amazon.com/user/profile', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json'
        }
      })
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile')
      }
      
      const profileData = await profileResponse.json()
      
      console.log('User profile retrieved:', {
        user_id: profileData.user_id || 'missing',
        name: profileData.name || 'missing',
        email: profileData.email || 'missing'
      })
      
      // 查找或创建用户
      const finalSellerId = sellingPartnerId || stateData.sellerId as string
      
      console.log('Creating/updating user with seller info:', {
        email: profileData.email,
        sellerId: finalSellerId,
        sellingPartnerId,
        stateDataSellerId: stateData.sellerId
      })
      
      const user = await prisma.user.upsert({
        where: {
          email: profileData.email
        },
        update: {
          name: profileData.name,
          amazonSellerId: finalSellerId,
          amazonMarketplaceId: process.env.AMAZON_MARKETPLACE_ID,
          amazonRegion: process.env.AMAZON_REGION
        },
        create: {
          email: profileData.email,
          name: profileData.name,
          amazonSellerId: finalSellerId,
          amazonMarketplaceId: process.env.AMAZON_MARKETPLACE_ID,
          amazonRegion: process.env.AMAZON_REGION
        }
      })
      
      // 保存账户信息
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'amazon',
            providerAccountId: profileData.user_id
          }
        },
        update: {
          access_token,
          refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + expires_in,
          token_type: 'Bearer',
          scope: 'profile'
        },
        create: {
          userId: user.id,
          type: 'oauth',
          provider: 'amazon',
          providerAccountId: profileData.user_id,
          access_token,
          refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + expires_in,
          token_type: 'Bearer',
          scope: 'profile'
        }
      })
      
      // 创建会话 token
      const sessionToken = sign(
        {
          userId: user.id,
          email: user.email,
          sellerId: sellingPartnerId || stateData.sellerId,
          accessToken: access_token,
          refreshToken: refresh_token
        },
        process.env.NEXTAUTH_SECRET || 'secret',
        { expiresIn: '30d' }
      )
      
      // 设置 cookie 并重定向到指定页面
      // 优先使用 state 中的 originalRedirectUri，然后使用环境变量，最后使用默认值
      let callbackUrl = process.env.DEFAULT_CALLBACK_URL || '/amazon-listing'
      if (stateData.originalRedirectUri && typeof stateData.originalRedirectUri === 'string') {
        try {
          const url = new URL(stateData.originalRedirectUri)
          callbackUrl = url.pathname + url.search
        } catch {
          // 如果不是有效 URL，则使用 pathname 部分
          callbackUrl = stateData.originalRedirectUri as string
        }
      }
      
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
      const finalRedirectUrl = `${baseUrl}${callbackUrl}`
      
      console.log('Redirecting user after successful authentication:', {
        callbackUrl,
        baseUrl,
        finalRedirectUrl,
        userId: user.id
      })
      
      const response = NextResponse.redirect(finalRedirectUrl, { status: 302 })
      response.cookies.set('next-auth.session-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30天
      })
      
      return response
      
    } catch (error) {
      console.error('Token exchange error:', error)
      return NextResponse.redirect(
        `/auth/error?error=token_exchange_failed&description=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`,
        { status: 302 }
      )
    }
    
  } catch (error) {
    console.error('Amazon callback error:', error)
    return NextResponse.redirect(
      '/auth/error?error=callback_error&description=An unexpected error occurred',
      { status: 302 }
    )
  }
}

// 处理 POST 请求（如果 Amazon 使用 POST 方式）
export async function POST(request: NextRequest) {
  return GET(request)
}
import { NextRequest, NextResponse } from 'next/server'
import { verifyStateToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sign } from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')
    const code = searchParams.get('code')
    const sellingPartnerId = searchParams.get('selling_partner_id')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
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
    const stateData = verifyStateToken(state)
    if (!stateData) {
      return NextResponse.redirect(
        '/auth/error?error=invalid_state&description=Invalid or expired state parameter',
        { status: 302 }
      )
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
      
      // 查找或创建用户
      const user = await prisma.user.upsert({
        where: {
          email: profileData.email
        },
        update: {
          name: profileData.name,
          amazonSellerId: sellingPartnerId || stateData.sellerId as string,
          amazonMarketplaceId: process.env.AMAZON_MARKETPLACE_ID,
          amazonRegion: process.env.AMAZON_REGION
        },
        create: {
          email: profileData.email,
          name: profileData.name,
          amazonSellerId: sellingPartnerId || stateData.sellerId as string,
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
      
      // 设置 cookie 并重定向到主页
      const response = NextResponse.redirect('/', { status: 302 })
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
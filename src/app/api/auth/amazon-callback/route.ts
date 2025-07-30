import { NextRequest, NextResponse } from 'next/server'
import { verifyStateToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sign } from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  console.log('🚀 Amazon callback started')
  
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
    console.log('📥 Amazon callback received:', {
      state: state ? 'present' : 'missing',
      code: code ? 'present' : 'missing',
      spapi_oauth_code: searchParams.get('spapi_oauth_code') ? 'present' : 'missing',
      sellingPartnerId: sellingPartnerId || 'not provided',
      error: error || 'none',
      errorDescription: errorDescription || 'none',
      url: request.url,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV
    })
    
    // 环境变量检查
    console.log('🔧 Environment check:', {
      hasClientId: !!process.env.AMAZON_LWA_CLIENT_ID,
      hasClientSecret: !!process.env.AMAZON_LWA_CLIENT_SECRET,
      hasRedirectUri: !!process.env.AMAZON_REDIRECT_URI,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    })
    
    // 处理错误情况
    if (error) {
      console.error('❌ Amazon authorization error:', error, errorDescription)
      const baseUrl = process.env.NEXTAUTH_URL || 'https://listing-generation1.vercel.app'
      return NextResponse.redirect(
        `${baseUrl}/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`,
        { status: 302 }
      )
    }
    
    // 验证必要参数
    if (!state || !code) {
      console.error('❌ Missing required parameters:', { hasState: !!state, hasCode: !!code })
      const baseUrl = process.env.NEXTAUTH_URL || 'https://listing-generation1.vercel.app'
      return NextResponse.redirect(
        `${baseUrl}/auth/error?error=missing_parameters&description=Missing required authorization parameters`,
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
    console.log('🔄 Starting token exchange...')
    try {
      const tokenRequestBody = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.AMAZON_REDIRECT_URI || '',
        client_id: process.env.AMAZON_LWA_CLIENT_ID || '',
        client_secret: process.env.AMAZON_LWA_CLIENT_SECRET || ''
      }
      
      console.log('🔑 Token exchange request:', {
        grant_type: tokenRequestBody.grant_type,
        hasCode: !!tokenRequestBody.code,
        redirect_uri: tokenRequestBody.redirect_uri,
        hasClientId: !!tokenRequestBody.client_id,
        hasClientSecret: !!tokenRequestBody.client_secret
      })
      
      const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(tokenRequestBody).toString()
      })
      
      console.log('📤 Token response status:', tokenResponse.status, tokenResponse.statusText)
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('❌ Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          response: errorText
        })
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: 'parse_error', error_description: errorText }
        }
        
        throw new Error(errorData.error_description || `Token exchange failed: ${tokenResponse.status}`)
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
      
      console.log('💾 Creating/updating user with seller info:', {
        email: profileData.email,
        sellerId: finalSellerId,
        sellingPartnerId,
        stateDataSellerId: stateData.sellerId
      })
      
      let user
      try {
        user = await prisma.user.upsert({
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
        console.log('✅ User created/updated successfully:', { userId: user.id })
      } catch (dbError) {
        console.error('❌ Database error - user upsert failed:', {
          error: dbError instanceof Error ? dbError.message : 'Unknown database error',
          email: profileData.email,
          sellerId: finalSellerId
        })
        throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
      }
      
      // 保存账户信息
      try {
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
        console.log('✅ Account saved successfully')
      } catch (accountError) {
        console.error('❌ Database error - account upsert failed:', {
          error: accountError instanceof Error ? accountError.message : 'Unknown error',
          userId: user.id,
          providerAccountId: profileData.user_id
        })
        throw new Error(`Account save error: ${accountError instanceof Error ? accountError.message : 'Unknown error'}`)
      }
      
      // 创建会话 token
      console.log('🔐 Creating session token...')
      let sessionToken
      try {
        sessionToken = sign(
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
        console.log('✅ Session token created')
      } catch (jwtError) {
        console.error('❌ JWT signing failed:', jwtError)
        throw new Error(`Session token creation failed: ${jwtError instanceof Error ? jwtError.message : 'Unknown error'}`)
      }
      
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
      
      const baseUrl = process.env.NEXTAUTH_URL || 'https://listing-generation1.vercel.app'
      const finalRedirectUrl = `${baseUrl}${callbackUrl}`
      
      console.log('🔄 Redirecting user after successful authentication:', {
        callbackUrl,
        baseUrl,
        finalRedirectUrl,
        userId: user.id
      })
      
      try {
        const response = NextResponse.redirect(finalRedirectUrl, { status: 302 })
        response.cookies.set('next-auth.session-token', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 // 30天
        })
        
        console.log('✅ Redirect response created successfully')
        return response
      } catch (redirectError) {
        console.error('❌ Redirect creation failed:', redirectError)
        throw new Error(`Redirect failed: ${redirectError instanceof Error ? redirectError.message : 'Unknown error'}`)
      }
      
    } catch (error) {
      console.error('❌ Token exchange error:', error)
      const baseUrl = process.env.NEXTAUTH_URL || 'https://listing-generation1.vercel.app'
      return NextResponse.redirect(
        `${baseUrl}/auth/error?error=token_exchange_failed&description=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`,
        { status: 302 }
      )
    }
    
  } catch (error) {
    console.error('💥 Amazon callback fatal error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      url: request.url
    })
    
    // 尝试生产环境友好的重定向
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'https://listing-generation1.vercel.app'
      const errorUrl = `${baseUrl}/auth/error?error=callback_error&description=${encodeURIComponent(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      )}`
      
      console.log('🔄 Redirecting to error page:', errorUrl)
      return NextResponse.redirect(errorUrl, { status: 302 })
    } catch (redirectError) {
      console.error('❌ Failed to redirect to error page:', redirectError)
      
      // 最后的备用方案 - 返回简单的错误响应
      return new NextResponse(JSON.stringify({
        error: 'callback_error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

// 处理 POST 请求（如果 Amazon 使用 POST 方式）
export async function POST(request: NextRequest) {
  return GET(request)
}
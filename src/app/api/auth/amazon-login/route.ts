import { NextRequest, NextResponse } from 'next/server'
import { generateStateToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // 从查询参数获取 Amazon 传递的参数
    const searchParams = request.nextUrl.searchParams
    const sellerId = searchParams.get('seller_id')
    const mwsAuthToken = searchParams.get('mws_auth_token') // 旧版参数，可能不存在
    const redirectUri = searchParams.get('redirect_uri')
    
    // 验证必要参数
    if (!sellerId) {
      return NextResponse.json({
        error: 'Missing required parameter: seller_id'
      }, { status: 400 })
    }
    
    // 生成安全的 state token，包含必要信息
    const stateData = {
      sellerId,
      mwsAuthToken,
      originalRedirectUri: redirectUri,
      timestamp: Date.now()
    }
    
    const state = generateStateToken(stateData)
    
    // 构建 Amazon 授权 URL
    const amazonAuthUrl = new URL('https://sellercentral.amazon.com/apps/authorize/consent')
    
    // 添加必要的查询参数
    amazonAuthUrl.searchParams.set('application_id', process.env.AMAZON_APPLICATION_ID || '')
    amazonAuthUrl.searchParams.set('redirect_uri', process.env.AMAZON_REDIRECT_URI || '')
    amazonAuthUrl.searchParams.set('state', state)
    
    // 如果是 draft 应用，添加 version 参数
    if (process.env.AMAZON_APP_IS_DRAFT === 'true') {
      amazonAuthUrl.searchParams.set('version', 'beta')
    }
    
    // 设置响应头，包括 referrer-policy
    const headers = new Headers({
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    })
    
    // 重定向到 Amazon 授权页面
    return NextResponse.redirect(amazonAuthUrl.toString(), {
      status: 302,
      headers
    })
    
  } catch (error) {
    console.error('Amazon login error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 处理 POST 请求（如果 Amazon 使用 POST 方式）
export async function POST(request: NextRequest) {
  return GET(request)
}
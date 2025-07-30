import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AmazonSPAPIService } from '@/services/amazon-sp-api'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({
        error: 'Not authenticated',
        status: 'error'
      }, { status: 401 })
    }
    
    console.log('Checking SP-API status for user:', {
      userId: session.user?.id,
      email: session.user?.email,
      sellerId: session.sellerId,
      amazonSellerId: session.user?.amazonSellerId,
      hasRefreshToken: !!session.refreshToken
    })
    
    // 创建 SP-API 服务实例
    const amazonSPAPI = await AmazonSPAPIService.fromSession()
    
    // 尝试验证凭证
    const isValid = await amazonSPAPI.validateCredentials()
    
    // 获取详细状态信息
    const status = {
      authenticated: true,
      credentialsValid: isValid,
      user: {
        id: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
        amazonSellerId: session.user?.amazonSellerId,
        amazonMarketplaceId: session.user?.amazonMarketplaceId,
        amazonRegion: session.user?.amazonRegion
      },
      session: {
        hasAccessToken: !!session.accessToken,
        hasRefreshToken: !!session.refreshToken,
        sellerId: session.sellerId
      },
      environment: {
        region: process.env.AMAZON_REGION || 'not set',
        marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'not set',
        useSandbox: process.env.AMAZON_USE_SANDBOX === 'true',
        hasClientId: !!process.env.AMAZON_LWA_CLIENT_ID,
        hasClientSecret: !!process.env.AMAZON_LWA_CLIENT_SECRET,
        hasApplicationId: !!process.env.AMAZON_APPLICATION_ID
      },
      recommendations: [] as string[]
    }
    
    // 添加建议
    if (!session.refreshToken) {
      status.recommendations.push('需要重新进行 Amazon OAuth 授权以获取 refresh token')
    }
    
    if (!session.sellerId && !session.user?.amazonSellerId) {
      status.recommendations.push('缺少 Seller ID，请确保授权时包含 selling_partner_id')
    }
    
    if (!isValid) {
      status.recommendations.push('SP-API 凭证验证失败，请检查授权状态和环境变量配置')
    }
    
    return NextResponse.json({
      success: true,
      status: isValid ? 'ready' : 'not_ready',
      data: status,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('SP-API status check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check SP-API status',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 })
  }
}


https://sellercentral.amazon.com/apps/authorize/consent?client_id=amzn1.application-oa2-client.69ece15f456e4dfe8a62e7431a711c4b&scope=openid&response_type=code&redirect_uri=https%3A%2F%2Flisting-generation1.vercel.app%2Fapi%2Fauth%2Fcallback%2Famazon&application_id=amzn1.sp.solution.4a99cfd6-31a3-4369-b2f9-b3aeae2b4e8b&version=beta&state=XMauEJLkDBZb3Y3Smkmd0Qf8CmGMmo7A8GRISqiHo6A
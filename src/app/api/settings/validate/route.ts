import { NextRequest, NextResponse } from 'next/server'
import SellingPartnerAPI from 'amazon-sp-api'

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json()
    
    // 创建临时客户端进行验证
    const client = new SellingPartnerAPI({
      region: settings.AMAZON_REGION || 'na',
      refresh_token: settings.AMAZON_LWA_REFRESH_TOKEN,
      client_id: settings.AMAZON_LWA_CLIENT_ID,
      client_secret: settings.AMAZON_LWA_CLIENT_SECRET,
      options: {
        auto_request_tokens: true,
        use_sandbox: false
      }
    })
    
    // 尝试调用一个简单的 API 来验证凭证
    try {
      await client.callAPI({
        operation: 'getMarketplaceParticipations',
        endpoint: 'sellers'
      })
      
      return NextResponse.json({
        success: true,
        message: 'API 凭证验证成功！您可以开始使用亚马逊商品刊登功能。'
      })
    } catch (apiError: unknown) {
      console.error('API 调用失败:', apiError)
      
      let errorMessage = 'API 凭证验证失败'
      if (apiError instanceof Error && apiError.message?.includes('401')) {
        errorMessage = '认证失败：请检查您的 Client ID、Client Secret 和 Refresh Token 是否正确'
      } else if (apiError instanceof Error && apiError.message?.includes('403')) {
        errorMessage = '权限不足：请确保您的开发者账户具有必要的 API 权限'
      } else if (apiError instanceof Error && apiError.message?.includes('400')) {
        errorMessage = '请求参数错误：请检查所有字段是否填写正确'
      }
      
      return NextResponse.json({
        success: false,
        message: errorMessage,
        error: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('验证失败:', error)
    return NextResponse.json({
      success: false,
      message: '验证过程中发生错误，请检查您的输入'
    }, { status: 500 })
  }
}
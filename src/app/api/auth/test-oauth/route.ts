import { NextResponse } from 'next/server'
import { getOAuthDebugInfo, buildAmazonOAuthUrl } from '@/lib/amazon-oauth'

export async function GET() {
  try {
    const debugInfo = getOAuthDebugInfo()
    
    // 检查必需的环境变量
    const missingVars = []
    if (!debugInfo.applicationId) missingVars.push('AMAZON_APPLICATION_ID')
    if (!debugInfo.clientId) missingVars.push('AMAZON_OAUTH_CLIENT_ID')
    if (!debugInfo.nextAuthUrl) missingVars.push('NEXTAUTH_URL')
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        message: `缺少必需的环境变量: ${missingVars.join(', ')}`,
        debugInfo,
        missingVars
      }, { status: 400 })
    }
    
    // 生成测试 OAuth URL
    const testUrl = buildAmazonOAuthUrl({
      applicationId: debugInfo.applicationId,
      clientId: debugInfo.clientId,
      redirectUri: debugInfo.redirectUri,
      state: 'test-state',
      isDraft: debugInfo.isDraft
    })
    
    return NextResponse.json({
      success: true,
      message: 'OAuth 配置检查完成',
      debugInfo,
      testUrl,
      recommendations: [
        '确保在 Amazon Developer Console 中正确配置了回调 URL',
        '如果是 Draft 应用，确保使用了 version=beta 参数',
        '验证 Application ID 是否来自正确的 Amazon 应用',
        '检查 Client ID 和 Client Secret 是否匹配'
      ]
    })
    
  } catch (error) {
    console.error('OAuth 配置测试失败:', error)
    return NextResponse.json({
      success: false,
      message: '配置测试失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
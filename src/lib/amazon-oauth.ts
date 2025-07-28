/**
 * Amazon SP-API OAuth URL 构造器
 * 用于生成正确的授权 URL，包含所有必需的 SP-API 参数
 */

export interface AmazonOAuthParams {
  applicationId: string
  clientId: string
  redirectUri: string
  state: string
  isDraft?: boolean
}

/**
 * 构造 Amazon SP-API OAuth 授权 URL
 */
export function buildAmazonOAuthUrl(params: AmazonOAuthParams): string {
  const baseUrl = 'https://sellercentral.amazon.com/apps/authorize/consent'
  
  const searchParams = new URLSearchParams({
    application_id: params.applicationId,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    state: params.state
  })
  
  // 如果是 Draft 应用，添加 version=beta 参数
  if (params.isDraft) {
    searchParams.append('version', 'beta')
  }
  
  const authUrl = `${baseUrl}?${searchParams.toString()}`
  
  console.log('Amazon OAuth URL:', authUrl)
  
  return authUrl
}

/**
 * 验证 Amazon OAuth 回调参数
 */
export function validateOAuthCallback(searchParams: URLSearchParams) {
  const code = searchParams.get('spapi_oauth_code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  if (error) {
    throw new Error(`OAuth Error: ${error}`)
  }
  
  if (!code) {
    throw new Error('Authorization code not found in callback')
  }
  
  if (!state) {
    throw new Error('State parameter not found in callback')
  }
  
  return { code, state }
}

/**
 * 获取授权 URL 的调试信息
 */
export function getOAuthDebugInfo() {
  return {
    applicationId: process.env.AMAZON_APPLICATION_ID,
    clientId: process.env.AMAZON_OAUTH_CLIENT_ID,
    isDraft: process.env.AMAZON_APP_IS_DRAFT === 'true',
    nextAuthUrl: process.env.NEXTAUTH_URL,
    redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/callback/amazon`
  }
}
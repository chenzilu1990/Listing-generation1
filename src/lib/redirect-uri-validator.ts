/**
 * 重定向 URI 配置验证工具
 * 用于验证 Amazon SP-API OAuth 重定向 URI 配置是否正确
 */

export interface RedirectUriValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

/**
 * 验证重定向 URI 配置
 */
export function validateRedirectUri(): RedirectUriValidationResult {
  const result: RedirectUriValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    recommendations: []
  }

  const redirectUri = process.env.AMAZON_REDIRECT_URI
  const nextAuthUrl = process.env.NEXTAUTH_URL
  const applicationId = process.env.AMAZON_APPLICATION_ID
  const nodeEnv = process.env.NODE_ENV

  // 检查必需的环境变量
  if (!redirectUri) {
    result.isValid = false
    result.errors.push('AMAZON_REDIRECT_URI 环境变量未配置')
    result.recommendations.push('请在 .env 文件中设置 AMAZON_REDIRECT_URI')
  }

  if (!nextAuthUrl) {
    result.warnings.push('NEXTAUTH_URL 环境变量未配置')
    result.recommendations.push('建议设置 NEXTAUTH_URL 以确保正确的重定向')
  }

  if (!applicationId) {
    result.warnings.push('AMAZON_APPLICATION_ID 环境变量未配置')
    result.recommendations.push('请在 Amazon Developer Console 获取 Application ID')
  }

  if (redirectUri) {
    // 验证重定向 URI 格式
    try {
      const uri = new URL(redirectUri)
      
      // 检查协议
      if (!['http:', 'https:'].includes(uri.protocol)) {
        result.isValid = false
        result.errors.push(`重定向 URI 协议无效: ${uri.protocol}，应该是 http: 或 https:`)
      }

      // 检查路径
      if (!uri.pathname.includes('/api/auth/amazon-callback')) {
        result.isValid = false
        result.errors.push('重定向 URI 路径不正确，应该包含 /api/auth/amazon-callback')
      }

      // 生产环境检查
      if (nodeEnv === 'production') {
        if (uri.protocol !== 'https:') {
          result.isValid = false
          result.errors.push('生产环境必须使用 HTTPS')
        }
        
        if (uri.hostname === 'localhost' || uri.hostname === '127.0.0.1') {
          result.isValid = false
          result.errors.push('生产环境不能使用 localhost 或 127.0.0.1')
        }
      }

      // 开发环境建议
      if (nodeEnv === 'development') {
        if (uri.protocol === 'https:' && uri.hostname === 'localhost') {
          result.warnings.push('开发环境使用 HTTPS localhost 可能导致证书问题')
        }
      }

    } catch (error) {
      result.isValid = false
      result.errors.push(`重定向 URI 格式无效: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // NextAuth URL 和重定向 URI 一致性检查
  if (redirectUri && nextAuthUrl) {
    try {
      const redirectUrl = new URL(redirectUri)
      const authUrl = new URL(nextAuthUrl)
      
      if (redirectUrl.origin !== authUrl.origin) {
        result.warnings.push('AMAZON_REDIRECT_URI 和 NEXTAUTH_URL 的域名不一致')
        result.recommendations.push('确保两个 URL 使用相同的域名和端口')
      }
    } catch (error) {
      result.warnings.push('无法验证 URL 一致性: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 添加配置建议
  result.recommendations.push(
    '确保在 Amazon Developer Console 中添加相同的重定向 URI',
    '如果使用 draft 应用，确保 AMAZON_APP_IS_DRAFT=true',
    '生产环境部署后，更新 Amazon Developer Console 中的重定向 URI'
  )

  return result
}

/**
 * 格式化验证结果为可读字符串
 */
export function formatValidationResult(result: RedirectUriValidationResult): string {
  const lines: string[] = []
  
  if (result.isValid) {
    lines.push('✅ 重定向 URI 配置验证通过')
  } else {
    lines.push('❌ 重定向 URI 配置验证失败')
  }
  
  if (result.errors.length > 0) {
    lines.push('\n错误:')
    result.errors.forEach(error => lines.push(`  • ${error}`))
  }
  
  if (result.warnings.length > 0) {
    lines.push('\n警告:')
    result.warnings.forEach(warning => lines.push(`  • ${warning}`))
  }
  
  if (result.recommendations.length > 0) {
    lines.push('\n建议:')
    result.recommendations.forEach(rec => lines.push(`  • ${rec}`))
  }
  
  return lines.join('\n')
}

/**
 * 生成 Amazon Developer Console 配置指导
 */
export function generateAmazonConsoleGuide(): string {
  const redirectUri = process.env.AMAZON_REDIRECT_URI
  const nodeEnv = process.env.NODE_ENV
  
  return `
Amazon Developer Console 配置指导:

1. 登录 Amazon Developer Console
   https://developer.amazon.com/apps-and-games

2. 选择您的 SP-API 应用

3. 在 "OAuth Settings" 中添加重定向 URI:
   ${redirectUri || '请先配置 AMAZON_REDIRECT_URI'}

4. 如果是开发环境，还需要添加:
   http://localhost:3001/api/auth/amazon-callback

5. 保存配置并等待生效（可能需要几分钟）

当前环境: ${nodeEnv || 'unknown'}
当前配置的重定向 URI: ${redirectUri || '未配置'}

注意事项:
- 重定向 URI 必须完全匹配（包括协议、域名、端口、路径）
- 生产环境必须使用 HTTPS
- Draft 应用需要设置 version=beta 参数
`
}
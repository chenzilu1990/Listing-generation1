'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const errorMessages: Record<string, string> = {
  Configuration: '服务器配置错误，请联系管理员',
  AccessDenied: '访问被拒绝，您可能没有必要的权限',
  Verification: '验证失败，请重试',
  Default: '登录过程中发生未知错误',
  OAuthSignin: 'OAuth 登录初始化失败',
  OAuthCallback: 'OAuth 回调处理失败',
  OAuthCreateAccount: '创建 OAuth 账户失败',
  EmailCreateAccount: '创建邮箱账户失败',
  Callback: '回调处理失败',
  OAuthAccountNotLinked: 'OAuth 账户未关联，请使用相同的账户登录',
  EmailSignin: '邮箱登录失败',
  CredentialsSignin: '凭证登录失败，请检查用户名和密码',
  SessionRequired: '需要登录才能访问此页面',
  
  // Amazon SP-API 特定错误
  'unable_to_find_application': '无法找到应用程序：请检查 Application ID 配置',
  'invalid_request': '无效请求：请检查 OAuth 参数配置',
  'unauthorized_client': '未授权的客户端：请检查 Client ID 和 Client Secret',
  'unsupported_response_type': '不支持的响应类型：请检查 OAuth 配置',
  'invalid_scope': '无效的权限范围：请检查应用权限配置',
  'server_error': '服务器错误：Amazon OAuth 服务暂时不可用'
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  
  const errorMessage = error && errorMessages[error] 
    ? errorMessages[error] 
    : errorMessages.Default

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录失败
          </h2>
          <p className="mt-2 text-center text-sm text-red-600">
            {errorMessage}
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <div className="space-y-4">
            {error === 'AccessDenied' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="text-sm text-yellow-800">
                  <h4 className="font-medium mb-2">可能的原因：</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• 您的 Amazon 账户不是卖家账户</li>
                    <li>• 应用程序没有获得必要的权限</li>
                    <li>• 您取消了授权过程</li>
                  </ul>
                </div>
              </div>
            )}

            {error === 'OAuthCallback' && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="text-sm text-blue-800">
                  <h4 className="font-medium mb-2">可能的解决方案：</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• 检查回调 URL 配置是否正确</li>
                    <li>• 确认 OAuth 应用程序设置</li>
                    <li>• 联系系统管理员</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/auth/signin"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                重新登录
              </Link>
              
              <Link
                href="/settings"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                手动配置凭证
              </Link>
              
              <Link
                href="/"
                className="w-full flex justify-center py-2 px-4 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            如果问题持续存在，请联系技术支持
          </p>
        </div>
      </div>
    </div>
  )
}
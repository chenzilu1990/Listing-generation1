'use client'

import { signIn, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { buildAmazonOAuthUrl, getOAuthDebugInfo } from '@/lib/amazon-oauth'


export default function SignInPage() {
  const { status } = useSession()
  const router = useRouter()
  const [showDebug, setShowDebug] = useState(false)
  const [oauthUrl, setOauthUrl] = useState('')


  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    // 生成预览 OAuth URL 用于调试
    try {
      const debugInfo = getOAuthDebugInfo()
      if (debugInfo.applicationId && debugInfo.clientId && debugInfo.nextAuthUrl) {
        const previewUrl = buildAmazonOAuthUrl({
          applicationId: debugInfo.applicationId,
          clientId: debugInfo.clientId,
          redirectUri: debugInfo.redirectUri,
          state: 'preview-state',
          isDraft: debugInfo.isDraft
        })
        setOauthUrl(previewUrl)
      }
    } catch (error) {
      console.error('生成 OAuth URL 失败:', error)
    }
  }, [])

  const handleAmazonSignIn = async () => {
    await signIn('amazon', { 
      callbackUrl: '/',
      redirect: true
    })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-green-600">已登录，正在跳转...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录到商品刊登系统
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            使用 Amazon 账户登录以获取 SP-API 权限
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="bg-white py-8 px-6 shadow rounded-lg">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Amazon LWA 授权登录
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  点击下方按钮使用您的亚马逊卖家账户登录，系统将自动获取 SP-API 访问权限。
                </p>
              </div>

              <button
                onClick={handleAmazonSignIn}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.564 21.415c-4.392.296-8.298-1.228-10.9-4.123-.236-.262-.02-.619.334-.467 4.214 2.456 9.427 3.943 14.789 1.092.544-.288 1-.1.678.467-1.473 2.6-3.502 4.668-5.901 3.031zm1.432-.582c-.559-.717-3.673-.339-5.075-.17-.426.051-.492-.319-.108-.585 2.486-1.752 6.568-1.247 7.044-.659.476.588-.127 4.667-2.454 6.617-.356.298-.694.14-.537-.254.528-1.318 1.706-4.281 1.130-4.949zm-3.996-7.833v-2h2v2h-2zm0 4v-2h2v2h-2z"/>
                </svg>
                使用 Amazon 账户登录
              </button>

              <div className="mt-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">或</span>
                  </div>
                </div>
              </div>

              <Link
                href="/settings"
                className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                手动配置 API 凭证
              </Link>
            </div>

            <div className="mt-8 border-t pt-6">
              <div className="text-sm text-gray-600">
                <h4 className="font-medium mb-2">使用 Amazon 登录的优势：</h4>
                <ul className="space-y-1 text-xs">
                  <li>• 自动获取 SP-API 访问权限</li>
                  <li>• 无需手动输入复杂的 API 凭证</li>
                  <li>• 更安全的 OAuth 2.0 授权流程</li>
                  <li>• 支持 Token 自动刷新</li>
                </ul>
              </div>
              
              {/* 调试信息 */}
              <div className="mt-4">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {showDebug ? '隐藏' : '显示'} 调试信息
                </button>
                
                {showDebug && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                    <p className="font-medium mb-2">OAuth 配置:</p>
                    <div className="space-y-1 text-gray-600">
                      <p>Application ID: {getOAuthDebugInfo().applicationId || '未配置'}</p>
                      <p>Client ID: {getOAuthDebugInfo().clientId || '未配置'}</p>
                      <p>Is Draft: {getOAuthDebugInfo().isDraft ? 'Yes' : 'No'}</p>
                      <p>Redirect URI: {getOAuthDebugInfo().redirectUri || '未配置'}</p>
                    </div>
                    
                    {oauthUrl && (
                      <div className="mt-3">
                        <p className="font-medium mb-1">预览授权 URL:</p>
                        <div className="bg-white p-2 rounded border text-xs break-all">
                          <a href={oauthUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {oauthUrl}
                          </a>
                        </div>
                        <p className="text-gray-500 mt-1">
                          ⚠️ 这是预览 URL，实际登录会使用不同的 state 参数
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              ← 返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
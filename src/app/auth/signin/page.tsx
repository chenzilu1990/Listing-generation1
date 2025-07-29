'use client'

import { signIn, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'


export default function SignInPage() {
  const { status } = useSession()
  const router = useRouter()
  const [useDirectAuth, setUseDirectAuth] = useState(false)


  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/')
    }
  }, [status, router])


  const handleAmazonSignIn = async () => {
    if (useDirectAuth) {
      // 使用直接授权流程
      window.location.href = `/api/auth/amazon-login?seller_id=${encodeURIComponent('YOUR_SELLER_ID')}`
    } else {
      // 使用 NextAuth 流程
      await signIn('amazon', { 
        callbackUrl: '/',
        redirect: true
      })
    }
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

              <div className="space-y-3">
                <button
                  onClick={handleAmazonSignIn}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.564 21.415c-4.392.296-8.298-1.228-10.9-4.123-.236-.262-.02-.619.334-.467 4.214 2.456 9.427 3.943 14.789 1.092.544-.288 1-.1.678.467-1.473 2.6-3.502 4.668-5.901 3.031zm1.432-.582c-.559-.717-3.673-.339-5.075-.17-.426.051-.492-.319-.108-.585 2.486-1.752 6.568-1.247 7.044-.659.476.588-.127 4.667-2.454 6.617-.356.298-.694.14-.537-.254.528-1.318 1.706-4.281 1.130-4.949zm-3.996-7.833v-2h2v2h-2zm0 4v-2h2v2h-2z"/>
                  </svg>
                  使用 Amazon 账户登录
                </button>
                
                <div className="flex items-center">
                  <input
                    id="use-direct-auth"
                    type="checkbox"
                    checked={useDirectAuth}
                    onChange={(e) => setUseDirectAuth(e.target.checked)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label htmlFor="use-direct-auth" className="ml-2 text-sm text-gray-600">
                    使用 SP-API 直接授权流程（需要 Seller ID）
                  </label>
                </div>
              </div>

            </div>

            <div className="mt-8 border-t pt-6">
              <div className="text-sm text-gray-600">
                <h4 className="font-medium mb-2">使用 Amazon 登录的优势：</h4>
                <ul className="space-y-1 text-xs">
                  <li>• 自动获取 SP-API 访问权限</li>
                  <li>• 无需手动输入复杂的 API 凭证</li>
                  <li>• 更安全的 OAuth 2.0 授权流程</li>
                  <li>• 支持 Token 自动刷新</li>
                  <li>• 年度授权更新提醒</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">注意事项：</h4>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• 确保您的应用已在 Amazon Developer Console 中正确配置</li>
              <li>• Redirect URI 必须与应用设置中的完全一致</li>
              <li>• Draft 应用需要添加 version=beta 参数</li>
              <li>• 授权需要每年更新一次</li>
            </ul>
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
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ApiSettings {
  AMAZON_LWA_CLIENT_ID: string
  AMAZON_LWA_CLIENT_SECRET: string
  AMAZON_LWA_REFRESH_TOKEN: string
  AMAZON_SELLER_ID: string
  AMAZON_MARKETPLACE_ID: string
  AMAZON_REGION: string
}

const marketplaces = [
  { id: 'ATVPDKIKX0DER', name: '美国', region: 'na' },
  { id: 'A2EUQ1WTGCTBG2', name: '加拿大', region: 'na' },
  { id: 'A1AM78C64UM0Y8', name: '墨西哥', region: 'na' },
  { id: 'A1F83G8C2ARO7P', name: '英国', region: 'eu' },
  { id: 'A1PA6795UKMFR9', name: '德国', region: 'eu' },
  { id: 'A13V1IB3VIYZZH', name: '法国', region: 'eu' },
  { id: 'APJ6JRA9NG5V4', name: '意大利', region: 'eu' },
  { id: 'A1RKKUPIHCS9HS', name: '西班牙', region: 'eu' },
  { id: 'A1VC38T7YXB528', name: '日本', region: 'fe' },
  { id: 'A39IBJ37TRP1C6', name: '澳大利亚', region: 'fe' },
  { id: 'A19VAU5U5O7RUS', name: '新加坡', region: 'fe' },
  { id: 'A21TJRUUN4KGV', name: '印度', region: 'fe' }
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<ApiSettings>({
    AMAZON_LWA_CLIENT_ID: '',
    AMAZON_LWA_CLIENT_SECRET: '',
    AMAZON_LWA_REFRESH_TOKEN: '',
    AMAZON_SELLER_ID: '',
    AMAZON_MARKETPLACE_ID: 'ATVPDKIKX0DER',
    AMAZON_REGION: 'na'
  })
  
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  
  const [showSecrets, setShowSecrets] = useState({
    clientSecret: false,
    refreshToken: false
  })

  useEffect(() => {
    // 从本地存储加载设置
    const savedSettings = localStorage.getItem('amazonApiSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleMarketplaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const marketplaceId = e.target.value
    const marketplace = marketplaces.find(m => m.id === marketplaceId)
    if (marketplace) {
      setSettings(prev => ({
        ...prev,
        AMAZON_MARKETPLACE_ID: marketplaceId,
        AMAZON_REGION: marketplace.region
      }))
    }
  }

  const handleSave = () => {
    // 保存到本地存储
    localStorage.setItem('amazonApiSettings', JSON.stringify(settings))
    alert('设置已保存！请注意：这些凭证仅保存在浏览器本地存储中。为了安全起见，建议在服务器端配置这些凭证。')
  }

  const handleValidate = async () => {
    setIsValidating(true)
    setValidationResult(null)

    try {
      const response = await fetch('/api/settings/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      const result = await response.json()
      setValidationResult({
        success: result.success,
        message: result.message || (result.success ? 'API 凭证验证成功！' : 'API 凭证验证失败')
      })
    } catch {
      setValidationResult({
        success: false,
        message: '验证失败，请检查网络连接'
      })
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">亚马逊 API 设置</h1>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700"
          >
            返回首页
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">API 凭证配置</h2>
            <p className="text-sm text-gray-600 mb-4">
              请在 Amazon Seller Central 的开发者中心获取这些凭证。
              <a 
                href="https://sellercentral.amazon.com/apps/manage/sp-api/app-authorization" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 ml-1"
              >
                前往 Seller Central →
              </a>
            </p>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LWA Client ID
              </label>
              <input
                type="text"
                name="AMAZON_LWA_CLIENT_ID"
                value={settings.AMAZON_LWA_CLIENT_ID}
                onChange={handleInputChange}
                placeholder="amzn1.application-oa2-client.xxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LWA Client Secret
              </label>
              <div className="relative">
                <input
                  type={showSecrets.clientSecret ? 'text' : 'password'}
                  name="AMAZON_LWA_CLIENT_SECRET"
                  value={settings.AMAZON_LWA_CLIENT_SECRET}
                  onChange={handleInputChange}
                  placeholder="输入 Client Secret"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(prev => ({ ...prev, clientSecret: !prev.clientSecret }))}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                >
                  {showSecrets.clientSecret ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LWA Refresh Token
              </label>
              <div className="relative">
                <input
                  type={showSecrets.refreshToken ? 'text' : 'password'}
                  name="AMAZON_LWA_REFRESH_TOKEN"
                  value={settings.AMAZON_LWA_REFRESH_TOKEN}
                  onChange={handleInputChange}
                  placeholder="Atzr|xxxxxx"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(prev => ({ ...prev, refreshToken: !prev.refreshToken }))}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                >
                  {showSecrets.refreshToken ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seller ID
              </label>
              <input
                type="text"
                name="AMAZON_SELLER_ID"
                value={settings.AMAZON_SELLER_ID}
                onChange={handleInputChange}
                placeholder="A1XXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                销售市场
              </label>
              <select
                value={settings.AMAZON_MARKETPLACE_ID}
                onChange={handleMarketplaceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {marketplaces.map(marketplace => (
                  <option key={marketplace.id} value={marketplace.id}>
                    {marketplace.name} ({marketplace.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                区域
              </label>
              <input
                type="text"
                value={settings.AMAZON_REGION}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
          </form>

          {validationResult && (
            <div className={`mt-4 p-4 rounded-md ${
              validationResult.success 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {validationResult.message}
            </div>
          )}

          <div className="mt-6 flex gap-4">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              保存设置
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isValidating ? '验证中...' : '验证凭证'}
            </button>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">重要提示</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 这些凭证将保存在浏览器的本地存储中，仅供演示使用</li>
              <li>• 在生产环境中，请将凭证保存在服务器端的环境变量中</li>
              <li>• 确保您的亚马逊开发者账户已获得必要的 API 权限</li>
              <li>• 使用沙盒环境进行测试，避免影响真实商品</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
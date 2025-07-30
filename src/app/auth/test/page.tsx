'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AuthTestPage() {
  const [sellerId, setSellerId] = useState('')
  const [isDraft, setIsDraft] = useState(true)
  const [region, setRegion] = useState('na')
  
  const marketplaceIds = {
    na: 'ATVPDKIKX0DER', // 美国
    ca: 'A2EUQ1WTGCTBG2', // 加拿大
    mx: 'A1AM78C64UM0Y8', // 墨西哥
    uk: 'A1F83G8C2ARO7P', // 英国
    de: 'A1PA6795UKMFR9', // 德国
    fr: 'A13V1IB3VIYZZH', // 法国
    it: 'APJ6JRA9NG5V4', // 意大利
    es: 'A1RKKUPIHCS9HS', // 西班牙
    jp: 'A1VC38T7YXB528', // 日本
    au: 'A39IBJ37TRP1C6', // 澳大利亚
    sg: 'A19VAU5U5O7RUS', // 新加坡
    in: 'A21TJRUUN4KGV' // 印度
  }
  
  const generateAuthUrl = () => {
    const baseUrl = 'https://sellercentral.amazon.com/apps/authorize/consent'
    // 使用环境变量中配置的重定向 URI，而不是动态生成
    const redirectUri = process.env.NEXT_PUBLIC_AMAZON_REDIRECT_URI || 'http://localhost:3001/api/auth/amazon-callback'
    const params = new URLSearchParams({
      application_id: process.env.NEXT_PUBLIC_AMAZON_APPLICATION_ID || 'YOUR_APP_ID',
      redirect_uri: redirectUri,
      state: btoa(JSON.stringify({ sellerId, region, timestamp: Date.now() }))
    })
    
    if (isDraft) {
      params.append('version', 'beta')
    }
    
    return `${baseUrl}?${params.toString()}`
  }
  
  const handleDirectAuth = () => {
    if (!sellerId) {
      alert('请输入 Seller ID')
      return
    }
    
    const loginUrl = `/api/auth/amazon-login?seller_id=${encodeURIComponent(sellerId)}&region=${region}`
    window.location.href = loginUrl
  }
  
  const handleCopyUrl = () => {
    const url = generateAuthUrl()
    navigator.clipboard.writeText(url)
    alert('授权 URL 已复制到剪贴板')
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Amazon SP-API 授权测试工具
          </h1>
          
          <div className="space-y-6">
            {/* 基本信息输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seller ID
              </label>
              <input
                type="text"
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入您的 Seller ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                区域/市场
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="na">北美 (NA)</option>
                <option value="eu">欧洲 (EU)</option>
                <option value="fe">远东 (FE)</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                市场 ID: {marketplaceIds[region as keyof typeof marketplaceIds] || marketplaceIds.na}
              </p>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is-draft"
                checked={isDraft}
                onChange={(e) => setIsDraft(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="is-draft" className="ml-2 text-sm text-gray-700">
                Draft 应用 (添加 version=beta 参数)
              </label>
            </div>
            
            {/* 测试按钮 */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">测试授权流程</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleDirectAuth}
                  className="w-full py-2 px-4 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  使用直接授权流程
                </button>
                
                <button
                  onClick={() => window.location.href = '/auth/signin'}
                  className="w-full py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  使用 NextAuth 流程
                </button>
              </div>
            </div>
            
            {/* 授权 URL 预览 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">授权 URL 预览</h3>
              <div className="bg-gray-100 p-3 rounded-md break-all text-sm font-mono">
                {generateAuthUrl()}
              </div>
              <button
                onClick={handleCopyUrl}
                className="mt-2 text-sm text-orange-600 hover:text-orange-700"
              >
                复制 URL
              </button>
            </div>
            
            {/* 环境变量检查 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">环境变量状态</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">AMAZON_APPLICATION_ID:</span>
                  <span className={process.env.NEXT_PUBLIC_AMAZON_APPLICATION_ID ? 'text-green-600' : 'text-red-600'}>
                    {process.env.NEXT_PUBLIC_AMAZON_APPLICATION_ID ? '已配置' : '未配置'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">AMAZON_REDIRECT_URI:</span>
                  <span className="text-gray-900 font-mono text-xs">
                    {process.env.NEXT_PUBLIC_AMAZON_REDIRECT_URI || 'http://localhost:3001/api/auth/amazon-callback'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">配置状态:</span>
                  <span className={process.env.NEXT_PUBLIC_AMAZON_REDIRECT_URI ? 'text-green-600' : 'text-yellow-600'}>
                    {process.env.NEXT_PUBLIC_AMAZON_REDIRECT_URI ? '已配置环境变量' : '使用默认值'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 文档链接 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">相关文档</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://developer-docs.amazon.com/sp-api/docs/website-authorization-workflow"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700"
                  >
                    Amazon SP-API 网站授权工作流程 →
                  </a>
                </li>
                <li>
                  <a
                    href="https://sellercentral.amazon.com/apps/manage/ref=xx_myreg_dnav_xx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700"
                  >
                    Amazon Seller Central 应用管理 →
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              ← 返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
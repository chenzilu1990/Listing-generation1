'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Product {
  id: string
  title: string
  brand: string
  price: number
  currency: string
  sku: string
  quantity: number
  category: string
  status: string
  createdAt: string
  images: Array<{ name: string; size: number; type: string }>
}

export default function ListingsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/amazon-listing')
      const result = await response.json()
      
      if (result.success) {
        setProducts(result.data)
      } else {
        setError(result.message || '获取商品列表失败')
      }
    } catch (error) {
      console.error('获取商品列表失败:', error)
      setError('获取商品列表失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryName = (category: string) => {
    const categories: Record<string, string> = {
      electronics: '电子产品',
      clothing: '服装',
      home: '家居用品',
      toys: '玩具',
      sports: '运动户外',
      books: '图书',
      beauty: '美妆个护',
      food: '食品'
    }
    return categories[category] || category
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { text: '待审核', class: 'bg-yellow-100 text-yellow-800' },
      active: { text: '已上架', class: 'bg-green-100 text-green-800' },
      inactive: { text: '已下架', class: 'bg-gray-100 text-gray-800' },
      rejected: { text: '已拒绝', class: 'bg-red-100 text-red-800' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.class}`}>
        {config.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">商品列表</h1>
          <Link
            href="/amazon-listing"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            创建新商品
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 mb-4">暂无商品</p>
            <Link
              href="/amazon-listing"
              className="text-blue-600 hover:text-blue-700"
            >
              立即创建第一个商品
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    商品信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    价格
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    库存
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类目
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {product.images && product.images.length > 0 ? (
                            <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-500">图</span>
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-gray-200"></div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.brand}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.currency} {product.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getCategoryName(product.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(product.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(product.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-4">
                        编辑
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
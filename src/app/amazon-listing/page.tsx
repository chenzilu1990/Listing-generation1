'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function AmazonListingPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    price: '',
    currency: 'USD',
    sku: '',
    upc: '',
    quantity: '',
    category: '',
    subcategory: '',
    bulletPoints: ['', '', '', '', ''],
    description: '',
    keywords: '',
    images: [] as File[],
    variationTheme: '',
    color: '',
    size: '',
    material: '',
    packageDimensions: {
      length: '',
      width: '',
      height: '',
      weight: '',
      unit: 'inches'
    }
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleBulletPointChange = (index: number, value: string) => {
    const newBulletPoints = [...formData.bulletPoints]
    newBulletPoints[index] = value
    setFormData(prev => ({
      ...prev,
      bulletPoints: newBulletPoints
    }))
  }

  const handleDimensionChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      packageDimensions: {
        ...prev.packageDimensions,
        [field]: value
      }
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }))
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    try {
      const formDataToSend = new FormData()
      
      // 添加基本字段
      formDataToSend.append('title', formData.title)
      formDataToSend.append('brand', formData.brand)
      formDataToSend.append('price', formData.price)
      formDataToSend.append('currency', formData.currency)
      formDataToSend.append('sku', formData.sku)
      formDataToSend.append('upc', formData.upc)
      formDataToSend.append('quantity', formData.quantity)
      formDataToSend.append('category', formData.category)
      formDataToSend.append('subcategory', formData.subcategory)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('keywords', formData.keywords)
      formDataToSend.append('variationTheme', formData.variationTheme)
      formDataToSend.append('color', formData.color)
      formDataToSend.append('size', formData.size)
      formDataToSend.append('material', formData.material)
      
      // 添加 bulletPoints
      formData.bulletPoints.forEach((point, index) => {
        formDataToSend.append(`bulletPoints[${index}]`, point)
      })
      
      // 添加 packageDimensions
      formDataToSend.append('packageDimensions.length', formData.packageDimensions.length)
      formDataToSend.append('packageDimensions.width', formData.packageDimensions.width)
      formDataToSend.append('packageDimensions.height', formData.packageDimensions.height)
      formDataToSend.append('packageDimensions.weight', formData.packageDimensions.weight)
      formDataToSend.append('packageDimensions.unit', formData.packageDimensions.unit)
      
      // 添加图片
      formData.images.forEach((image) => {
        formDataToSend.append('images', image)
      })
      
      const response = await fetch('/api/amazon-listing', {
        method: 'POST',
        body: formDataToSend
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('商品刊登成功！')
        router.push('/listings')
      } else {
        setError(result.message || '提交失败，请重试')
      }
    } catch (error) {
      console.error('提交失败:', error)
      setError('提交失败，请检查网络连接后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">亚马逊商品刊登</h1>
        
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-6">
          {/* 基本信息 */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">基本信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  商品标题 *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  品牌名称 *
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  价格 *
                </label>
                <div className="flex gap-2">
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="CNY">CNY</option>
                  </select>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPC/EAN
                </label>
                <input
                  type="text"
                  name="upc"
                  value={formData.upc}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  库存数量 *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* 分类信息 */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">分类信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  主类目 *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">请选择类目</option>
                  <option value="electronics">电子产品</option>
                  <option value="clothing">服装</option>
                  <option value="home">家居用品</option>
                  <option value="toys">玩具</option>
                  <option value="sports">运动户外</option>
                  <option value="books">图书</option>
                  <option value="beauty">美妆个护</option>
                  <option value="food">食品</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  子类目
                </label>
                <input
                  type="text"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 商品描述 */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">商品描述</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                产品要点 (Bullet Points) *
              </label>
              {formData.bulletPoints.map((point, index) => (
                <div key={index} className="mb-2">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => handleBulletPointChange(index, e.target.value)}
                    placeholder={`要点 ${index + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={index < 3}
                  />
                </div>
              ))}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                详细描述 *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                搜索关键词
              </label>
              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleInputChange}
                placeholder="用逗号分隔多个关键词"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 商品图片 */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">商品图片</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上传图片 (最多9张，主图必须)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="mb-4"
              />
              <div className="grid grid-cols-3 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative">
                    <Image
                      src={URL.createObjectURL(image)}
                      alt={`商品图片 ${index + 1}`}
                      width={150}
                      height={128}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        主图
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 变体信息 */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">变体信息 (可选)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  变体主题
                </label>
                <select
                  name="variationTheme"
                  value={formData.variationTheme}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">无变体</option>
                  <option value="color">颜色</option>
                  <option value="size">尺寸</option>
                  <option value="color-size">颜色-尺寸</option>
                </select>
              </div>
              
              {formData.variationTheme.includes('color') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    颜色
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              
              {formData.variationTheme.includes('size') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    尺寸
                  </label>
                  <input
                    type="text"
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  材质
                </label>
                <input
                  type="text"
                  name="material"
                  value={formData.material}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 包装信息 */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">包装信息</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  长度
                </label>
                <input
                  type="number"
                  value={formData.packageDimensions.length}
                  onChange={(e) => handleDimensionChange('length', e.target.value)}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  宽度
                </label>
                <input
                  type="number"
                  value={formData.packageDimensions.width}
                  onChange={(e) => handleDimensionChange('width', e.target.value)}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  高度
                </label>
                <input
                  type="number"
                  value={formData.packageDimensions.height}
                  onChange={(e) => handleDimensionChange('height', e.target.value)}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重量
                </label>
                <input
                  type="number"
                  value={formData.packageDimensions.weight}
                  onChange={(e) => handleDimensionChange('weight', e.target.value)}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                单位
              </label>
              <select
                value={formData.packageDimensions.unit}
                onChange={(e) => handleDimensionChange('unit', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="inches">英寸/磅</option>
                <option value="cm">厘米/千克</option>
              </select>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              disabled={isSubmitting}
            >
              保存草稿
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? '提交中...' : '提交刊登'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
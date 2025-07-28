import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AmazonSPAPIService, AmazonProduct } from '@/services/amazon-sp-api'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const productSchema = z.object({
  title: z.string().min(1, '商品标题不能为空'),
  brand: z.string().min(1, '品牌名称不能为空'),
  price: z.string().transform((val) => parseFloat(val)),
  currency: z.string(),
  sku: z.string().min(1, 'SKU不能为空'),
  upc: z.string().optional(),
  quantity: z.string().transform((val) => parseInt(val)),
  category: z.string().min(1, '请选择商品类目'),
  subcategory: z.string().optional(),
  bulletPoints: z.array(z.string()).length(5),
  description: z.string().min(1, '商品描述不能为空'),
  keywords: z.string().optional(),
  variationTheme: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  packageDimensions: z.object({
    length: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    weight: z.string().optional(),
    unit: z.string().optional()
  })
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const data = Object.fromEntries(formData.entries())
    
    // 处理 bulletPoints 数组
    const bulletPoints = []
    for (let i = 0; i < 5; i++) {
      bulletPoints.push(formData.get(`bulletPoints[${i}]`) as string || '')
    }
    
    // 处理 packageDimensions
    const packageDimensions = {
      length: formData.get('packageDimensions.length') as string || '',
      width: formData.get('packageDimensions.width') as string || '',
      height: formData.get('packageDimensions.height') as string || '',
      weight: formData.get('packageDimensions.weight') as string || '',
      unit: formData.get('packageDimensions.unit') as string || 'inches'
    }
    
    // 处理图片（这里只是模拟，实际需要上传到存储服务）
    const images = []
    const imageFiles = formData.getAll('images')
    for (const file of imageFiles) {
      if (file instanceof File) {
        // 这里应该上传到云存储并返回URL
        // 现在只是模拟
        images.push({
          name: file.name,
          size: file.size,
          type: file.type
        })
      }
    }
    
    const parsedData = {
      ...data,
      bulletPoints,
      packageDimensions,
      images
    }
    
    // 验证数据
    const validatedData = productSchema.parse(parsedData)
    
    // 获取当前用户会话
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 })
    }
    
    // 保存到本地数据库
    const product = await prisma.product.create({
      data: {
        title: validatedData.title,
        brand: validatedData.brand,
        price: validatedData.price,
        currency: validatedData.currency,
        sku: validatedData.sku,
        upc: validatedData.upc || null,
        quantity: validatedData.quantity,
        category: validatedData.category,
        subcategory: validatedData.subcategory || null,
        bulletPoint1: validatedData.bulletPoints[0],
        bulletPoint2: validatedData.bulletPoints[1],
        bulletPoint3: validatedData.bulletPoints[2],
        bulletPoint4: validatedData.bulletPoints[3] || null,
        bulletPoint5: validatedData.bulletPoints[4] || null,
        description: validatedData.description,
        keywords: validatedData.keywords || null,
        images: images,
        variationTheme: validatedData.variationTheme || null,
        color: validatedData.color || null,
        size: validatedData.size || null,
        material: validatedData.material || null,
        packageLength: validatedData.packageDimensions.length ? parseFloat(validatedData.packageDimensions.length) : null,
        packageWidth: validatedData.packageDimensions.width ? parseFloat(validatedData.packageDimensions.width) : null,
        packageHeight: validatedData.packageDimensions.height ? parseFloat(validatedData.packageDimensions.height) : null,
        packageWeight: validatedData.packageDimensions.weight ? parseFloat(validatedData.packageDimensions.weight) : null,
        packageUnit: validatedData.packageDimensions.unit || null,
        
        // 关联到当前用户
        userId: session.user.id as string
      }
    })
    
    // 尝试刊登到亚马逊
    let amazonListingResult = null
    let amazonError = null
    
    try {
      // 使用用户会话创建 SP-API 服务实例
      const amazonSPAPI = await AmazonSPAPIService.fromSession()
      
      // 检查 API 凭证是否配置
      const isValidCredentials = await amazonSPAPI.validateCredentials()
      
      if (isValidCredentials) {
        // 准备亚马逊商品数据
        const amazonProduct: AmazonProduct = {
          sku: validatedData.sku,
          title: validatedData.title,
          description: validatedData.description,
          bulletPoints: validatedData.bulletPoints.filter(point => point !== ''),
          brand: validatedData.brand,
          price: validatedData.price,
          currency: validatedData.currency,
          quantity: validatedData.quantity,
          images: [], // 图片上传需要单独处理
          category: validatedData.category,
          variationTheme: validatedData.variationTheme || undefined
        }
        
        // 获取市场 ID（优先使用用户设置，默认为美国市场）
        const marketplaceId = session.user.amazonMarketplaceId || 'ATVPDKIKX0DER'
        
        // 创建或更新刊登
        amazonListingResult = await amazonSPAPI.createOrUpdateListing(
          amazonProduct,
          marketplaceId,
          session.sellerId
        )
        
        // 更新本地数据库状态
        await prisma.product.update({
          where: { id: product.id },
          data: { status: 'active' }
        })
      } else {
        amazonError = '亚马逊 API 凭证未配置或无效'
      }
    } catch (error) {
      console.error('亚马逊刊登失败:', error)
      amazonError = error instanceof Error ? error.message : '亚马逊刊登失败'
    }
    
    return NextResponse.json({
      success: true,
      message: amazonListingResult 
        ? '商品已成功刊登到亚马逊！' 
        : '商品已保存到本地数据库' + (amazonError ? `，但亚马逊刊登失败: ${amazonError}` : ''),
      data: {
        ...product,
        amazonListingResult,
        amazonError
      }
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: '数据验证失败',
        errors: error.format()
      }, { status: 400 })
    }
    
    console.error('商品刊登失败:', error)
    return NextResponse.json({
      success: false,
      message: '商品刊登失败，请稍后重试'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: products
    })
  } catch (error) {
    console.error('获取商品列表失败:', error)
    return NextResponse.json({
      success: false,
      message: '获取商品列表失败'
    }, { status: 500 })
  }
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SellingPartnerAPI = require('amazon-sp-api')
import dotenv from 'dotenv'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

dotenv.config()

export interface AmazonProduct {
  sku: string
  title: string
  description: string
  bulletPoints: string[]
  brand: string
  price: number
  currency: string
  quantity: number
  images: string[]
  category: string
  productType?: string
  variationTheme?: string
  attributes?: Record<string, unknown>
}

export class AmazonSPAPIService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any
  private isInitialized: boolean = false
  private userCredentials: {
    refresh_token?: string
    client_id?: string
    client_secret?: string
    seller_id?: string
    region?: string
  } | null = null

  constructor(userCredentials?: {
    refresh_token?: string
    client_id?: string
    client_secret?: string
    seller_id?: string
    region?: string
  }) {
    if (userCredentials) {
      this.userCredentials = userCredentials
    }
    this.initializeClient()
  }

  private initializeClient() {
    try {
      // 优先使用用户凭证，然后使用环境变量
      const credentials = {
        region: this.userCredentials?.region || process.env.AMAZON_REGION || 'na',
        refresh_token: this.userCredentials?.refresh_token || process.env.AMAZON_LWA_REFRESH_TOKEN,
        client_id: this.userCredentials?.client_id || process.env.AMAZON_LWA_CLIENT_ID,
        client_secret: this.userCredentials?.client_secret || process.env.AMAZON_LWA_CLIENT_SECRET,
        options: {
          auto_request_tokens: true,
          use_sandbox: false // 生产环境设为 false
        }
      }

      // 验证必要的凭证
      if (!credentials.refresh_token || !credentials.client_id || !credentials.client_secret) {
        console.warn('Amazon SP-API 凭证未配置完整')
        return
      }

      this.client = new SellingPartnerAPI(credentials)
      this.isInitialized = true
    } catch (error) {
      console.error('初始化 Amazon SP-API 失败:', error)
    }
  }

  /**
   * 使用用户会话创建 SP-API 服务实例
   */
  static async fromSession(): Promise<AmazonSPAPIService> {
    try {
      const session = await getServerSession(authOptions)
      
      if (session?.refreshToken) {
        return new AmazonSPAPIService({
          refresh_token: session.refreshToken,
          client_id: process.env.AMAZON_OAUTH_CLIENT_ID,
          client_secret: process.env.AMAZON_OAUTH_CLIENT_SECRET,
          seller_id: session.sellerId,
          region: process.env.AMAZON_REGION || 'na'
        })
      }
    } catch (error) {
      console.error('从会话创建 SP-API 服务失败:', error)
    }
    
    // 回退到环境变量配置
    return new AmazonSPAPIService()
  }

  /**
   * 验证 API 凭证是否有效
   */
  async validateCredentials(): Promise<boolean> {
    if (!this.isInitialized) {
      return false
    }

    try {
      // 尝试获取市场参与信息来验证凭证
      await this.client.callAPI({
        operation: 'getMarketplaceParticipations',
        endpoint: 'sellers'
      })
      return true
    } catch (error) {
      console.error('API 凭证验证失败:', error)
      return false
    }
  }

  /**
   * 获取商品类型定义
   */
  async getProductTypeDefinition(productType: string, marketplaceId: string) {
    if (!this.isInitialized) {
      throw new Error('Amazon SP-API 未初始化')
    }

    try {
      const response = await this.client.callAPI({
        operation: 'getDefinitionsProductType',
        endpoint: 'definitions',
        path: {
          productType
        },
        query: {
          marketplaceIds: [marketplaceId],
          requirements: 'REQUIRED',
          locale: 'en_US'
        }
      })
      return response
    } catch (error) {
      console.error('获取商品类型定义失败:', error)
      throw error
    }
  }

  /**
   * 创建或更新商品刊登
   */
  async createOrUpdateListing(product: AmazonProduct, marketplaceId: string) {
    if (!this.isInitialized) {
      throw new Error('Amazon SP-API 未初始化')
    }

    try {
      // 构建商品属性
      const attributes: Record<string, unknown> = {
        title: [{
          value: product.title,
          language_tag: 'en_US',
          marketplace_id: marketplaceId
        }],
        description: [{
          value: product.description,
          language_tag: 'en_US',
          marketplace_id: marketplaceId
        }],
        brand: [{
          value: product.brand,
          language_tag: 'en_US',
          marketplace_id: marketplaceId
        }],
        bullet_point: product.bulletPoints.map((point, index) => ({
          value: point,
          language_tag: 'en_US',
          marketplace_id: marketplaceId,
          sequence: index + 1
        })),
        standard_price: [{
          value_with_tax: product.price,
          currency: product.currency,
          marketplace_id: marketplaceId
        }],
        fulfillment_availability: [{
          fulfillment_channel_code: 'DEFAULT',
          quantity: product.quantity,
          marketplace_id: marketplaceId
        }]
      }

      // 如果有额外的属性，合并进去
      if (product.attributes) {
        Object.assign(attributes, product.attributes)
      }

      // 使用 Listings API 创建或更新商品
      const response = await this.client.callAPI({
        operation: 'putListingsItem',
        endpoint: 'listings',
        path: {
          sellerId: process.env.AMAZON_SELLER_ID,
          sku: product.sku
        },
        body: {
          productType: product.productType || 'PRODUCT',
          requirements: 'LISTING',
          attributes
        }
      })

      return response
    } catch (error) {
      console.error('创建/更新商品刊登失败:', error)
      throw error
    }
  }

  /**
   * 上传商品图片
   */
  async uploadProductImages(_sku: string, _images: File[], _marketplaceId: string) {
    if (!this.isInitialized) {
      throw new Error('Amazon SP-API 未初始化')
    }

    // 注意：实际的图片上传需要先将图片上传到 S3 或其他云存储
    // 然后提供图片 URL 给亚马逊
    // 这里是简化的示例
    console.log('图片上传功能需要额外实现')
    return []
  }

  /**
   * 获取商品刊登状态
   */
  async getListingStatus(sku: string, marketplaceId: string) {
    if (!this.isInitialized) {
      throw new Error('Amazon SP-API 未初始化')
    }

    try {
      const response = await this.client.callAPI({
        operation: 'getListingsItem',
        endpoint: 'listings',
        path: {
          sellerId: process.env.AMAZON_SELLER_ID,
          sku
        },
        query: {
          marketplaceIds: [marketplaceId],
          includedData: ['summaries', 'attributes', 'issues', 'offers', 'fulfillmentAvailability']
        }
      })
      return response
    } catch (error) {
      console.error('获取商品刊登状态失败:', error)
      throw error
    }
  }

  /**
   * 批量获取商品刊登
   */
  async getListings(marketplaceId: string, nextToken?: string) {
    if (!this.isInitialized) {
      throw new Error('Amazon SP-API 未初始化')
    }

    try {
      const response = await this.client.callAPI({
        operation: 'searchCatalogItems',
        endpoint: 'catalog',
        query: {
          marketplaceIds: [marketplaceId],
          sellerId: process.env.AMAZON_SELLER_ID,
          pageSize: 20,
          nextToken
        }
      })
      return response
    } catch (error) {
      console.error('获取商品列表失败:', error)
      throw error
    }
  }

  /**
   * 删除商品刊登
   */
  async deleteListing(sku: string, marketplaceId: string) {
    if (!this.isInitialized) {
      throw new Error('Amazon SP-API 未初始化')
    }

    try {
      const response = await this.client.callAPI({
        operation: 'deleteListingsItem',
        endpoint: 'listings',
        path: {
          sellerId: process.env.AMAZON_SELLER_ID,
          sku
        },
        query: {
          marketplaceIds: [marketplaceId]
        }
      })
      return response
    } catch (error) {
      console.error('删除商品刊登失败:', error)
      throw error
    }
  }

  /**
   * 获取商品类别
   */
  async getCategories(marketplaceId: string) {
    if (!this.isInitialized) {
      throw new Error('Amazon SP-API 未初始化')
    }

    try {
      const response = await this.client.callAPI({
        operation: 'getCatalogCategories',
        endpoint: 'catalog',
        query: {
          marketplaceId
        }
      })
      return response
    } catch (error) {
      console.error('获取商品类别失败:', error)
      throw error
    }
  }
}

// 创建单例实例
export const amazonSPAPI = new AmazonSPAPIService()
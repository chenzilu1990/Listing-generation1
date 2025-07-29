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
    access_token?: string
    access_token_expires?: number
  } | null = null

  constructor(userCredentials?: {
    refresh_token?: string
    client_id?: string
    client_secret?: string
    seller_id?: string
    region?: string
    access_token?: string
    access_token_expires?: number
  }) {
    if (userCredentials) {
      this.userCredentials = userCredentials
    }
    this.initializeClient()
  }

  private initializeClient() {
    try {
      // 根据区域选择正确的端点
      const region = this.userCredentials?.region || process.env.AMAZON_REGION || 'na'
      const endpoints = {
        na: 'https://sellingpartnerapi-na.amazon.com',
        eu: 'https://sellingpartnerapi-eu.amazon.com',
        fe: 'https://sellingpartnerapi-fe.amazon.com'
      }
      
      // 优先使用用户凭证，然后使用环境变量
      const credentials = {
        region,
        refresh_token: this.userCredentials?.refresh_token || process.env.AMAZON_LWA_REFRESH_TOKEN,
        client_id: this.userCredentials?.client_id || process.env.AMAZON_LWA_CLIENT_ID,
        client_secret: this.userCredentials?.client_secret || process.env.AMAZON_LWA_CLIENT_SECRET,
        options: {
          auto_request_tokens: true,
          use_sandbox: process.env.AMAZON_USE_SANDBOX === 'true',
          sandbox_refresh_token: process.env.AMAZON_SANDBOX_REFRESH_TOKEN,
        },
        // 显式设置端点
        endpoints_versions: {
          endpoints: {
            [region]: endpoints[region as keyof typeof endpoints] || endpoints.na
          }
        }
      }

      // 验证必要的凭证
      if (!credentials.refresh_token || !credentials.client_id || !credentials.client_secret) {
        console.warn('Amazon SP-API 凭证未配置完整:', {
          has_refresh_token: !!credentials.refresh_token,
          has_client_id: !!credentials.client_id,
          has_client_secret: !!credentials.client_secret,
          region: credentials.region
        })
        return
      }

      console.log('Initializing Amazon SP-API with:', {
        region: credentials.region,
        endpoint: endpoints[region as keyof typeof endpoints],
        use_sandbox: credentials.options.use_sandbox
      })

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
          client_id: process.env.AMAZON_LWA_CLIENT_ID,
          client_secret: process.env.AMAZON_LWA_CLIENT_SECRET,
          seller_id: session.sellerId,
          region: process.env.AMAZON_REGION || 'na',
          access_token: session.accessToken,
          access_token_expires: session.user?.accessTokenExpires
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
      console.log('SP-API not initialized, cannot validate credentials')
      return false
    }

    try {
      // 确保 token 有效
      const tokenValid = await this.ensureValidToken()
      if (!tokenValid) {
        console.error('Failed to obtain valid access token')
        return false
      }

      // 尝试获取市场参与信息来验证凭证
      console.log('Validating credentials by fetching marketplace participations...')
      const response = await this.client.callAPI({
        operation: 'getMarketplaceParticipations',
        endpoint: 'sellers'
      })
      
      console.log('Credentials validated successfully', {
        participations: response?.length || 0
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
  async createOrUpdateListing(product: AmazonProduct, marketplaceId: string, sellerId?: string) {
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

      // 确保有 seller ID
      const finalSellerId = sellerId || this.userCredentials?.seller_id
      if (!finalSellerId) {
        throw new Error('Seller ID is required for listing creation')
      }

      console.log('Creating/updating listing:', {
        sellerId: finalSellerId,
        sku: product.sku,
        marketplaceId,
        productType: product.productType || 'PRODUCT'
      })

      // 确保在调用前刷新 token（如果需要）
      await this.ensureValidToken()

      // 使用 Listings API 创建或更新商品
      const response = await this.client.callAPI({
        operation: 'putListingsItem',
        endpoint: 'listings',
        path: {
          sellerId: finalSellerId,
          sku: product.sku
        },
        body: {
          productType: product.productType || 'PRODUCT',
          requirements: 'LISTING',
          attributes
        }
      })

      console.log('Listing creation response:', {
        status: response?.status,
        sku: product.sku
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
  async uploadProductImages() {
    if (!this.isInitialized) {
      throw new Error('Amazon SP-API 未初始化')
    }

    // 注意：实际的图片上传需要先将图片上传到 S3 或其他云存储
    // 然后提供图片 URL 给亚马逊
    // 这里是简化的示例，暂不实现
    throw new Error('图片上传功能暂未实现')
  }

  /**
   * 获取商品刊登状态
   */
  async getListingStatus(sku: string, marketplaceId: string, sellerId?: string) {
    if (!this.isInitialized) {
      throw new Error('Amazon SP-API 未初始化')
    }

    try {
      const response = await this.client.callAPI({
        operation: 'getListingsItem',
        endpoint: 'listings',
        path: {
          sellerId: sellerId || this.userCredentials?.seller_id,
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
  async getListings(marketplaceId: string, nextToken?: string, sellerId?: string) {
    if (!this.isInitialized) {
      throw new Error('Amazon SP-API 未初始化')
    }

    try {
      const response = await this.client.callAPI({
        operation: 'searchCatalogItems',
        endpoint: 'catalog',
        query: {
          marketplaceIds: [marketplaceId],
          sellerId: sellerId || this.userCredentials?.seller_id,
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
  async deleteListing(sku: string, marketplaceId: string, sellerId?: string) {
    if (!this.isInitialized) {
      throw new Error('Amazon SP-API 未初始化')
    }

    try {
      const response = await this.client.callAPI({
        operation: 'deleteListingsItem',
        endpoint: 'listings',
        path: {
          sellerId: sellerId || this.userCredentials?.seller_id,
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
  
  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(): Promise<string | null> {
    if (!this.userCredentials?.refresh_token) {
      console.error('No refresh token available')
      return null
    }
    
    try {
      const tokenEndpoint = process.env.AMAZON_LWA_ENDPOINT || 'https://api.amazon.com/auth/o2/token'
      const params = {
        grant_type: 'refresh_token',
        refresh_token: this.userCredentials.refresh_token,
        client_id: this.userCredentials.client_id || process.env.AMAZON_LWA_CLIENT_ID || '',
        client_secret: this.userCredentials.client_secret || process.env.AMAZON_LWA_CLIENT_SECRET || ''
      }
      
      console.log('Refreshing access token...', {
        endpoint: tokenEndpoint,
        client_id: params.client_id ? 'present' : 'missing',
        has_refresh_token: !!params.refresh_token
      })
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(params).toString()
      })
      
      const responseText = await response.text()
      
      if (!response.ok) {
        console.error('Token refresh failed:', {
          status: response.status,
          statusText: response.statusText,
          response: responseText
        })
        
        try {
          const errorData = JSON.parse(responseText)
          throw new Error(errorData.error_description || errorData.error || 'Token refresh failed')
        } catch {
          throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`)
        }
      }
      
      const tokenData = JSON.parse(responseText)
      
      console.log('Access token refreshed successfully', {
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type
      })
      
      // 更新内存中的 token
      this.userCredentials.access_token = tokenData.access_token
      this.userCredentials.access_token_expires = Date.now() + (tokenData.expires_in * 1000)
      
      // 重新初始化客户端
      this.initializeClient()
      
      return tokenData.access_token
    } catch (error) {
      console.error('Failed to refresh access token:', error)
      return null
    }
  }
  
  /**
   * 检查并刷新 token（如果需要）
   */
  private async ensureValidToken(): Promise<boolean> {
    if (this.userCredentials?.access_token_expires) {
      // 如果 token 将在 5 分钟内过期，刷新它
      if (Date.now() > this.userCredentials.access_token_expires - (5 * 60 * 1000)) {
        const newToken = await this.refreshAccessToken()
        return !!newToken
      }
    }
    return true
  }
}

// 创建单例实例
export const amazonSPAPI = new AmazonSPAPIService()
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from '@/lib/prisma'
import type { NextAuthOptions } from 'next-auth'
import { randomBytes } from 'crypto'
import jwt from 'jsonwebtoken'

// 生成安全的 state token
function generateStateToken(data: Record<string, unknown>): string {
  const secret = process.env.JWT_STATE_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
  return jwt.sign({
    ...data,
    nonce: randomBytes(16).toString('hex'),
    exp: Math.floor(Date.now() / 1000) + (60 * 10) // 10分钟过期
  }, secret)
}

// 验证 state token
function verifyStateToken(token: string): Record<string, unknown> | null {
  try {
    const secret = process.env.JWT_STATE_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
    return jwt.verify(token, secret) as Record<string, unknown>
  } catch {
    return null
  }
}

// Amazon SP-API OAuth Provider 配置
const amazonProvider = {
  id: 'amazon',
  name: 'Amazon',
  type: 'oauth' as const,
  version: '2.0',
  
  clientId: process.env.AMAZON_LWA_CLIENT_ID,
  clientSecret: process.env.AMAZON_LWA_CLIENT_SECRET,
  
  // SP-API 专用授权端点 - 根据文档要求的格式
  authorization: {
    url: 'https://sellercentral.amazon.com/apps/authorize/consent',
    params: {
      application_id: process.env.AMAZON_APPLICATION_ID,
      redirect_uri: process.env.AMAZON_REDIRECT_URI,
      ...(process.env.AMAZON_APP_IS_DRAFT === 'true' && { version: 'beta' })
    }
  },
  
  // Token 端点 - 用于交换授权码获取 Token
  token: {
    url: 'https://api.amazon.com/auth/o2/token',
    params: {
      grant_type: 'authorization_code',
      redirect_uri: process.env.AMAZON_REDIRECT_URI
    }
  },
  
  // 用户信息端点 - 获取用户基本信息
  userinfo: {
    url: 'https://api.amazon.com/user/profile'
  },
  
  // 用户信息映射
  profile(profile: { user_id: string; name: string; email: string }) {
    return {
      id: profile.user_id,
      name: profile.name,
      email: profile.email,
      image: null
    }
  },
  
  checks: ['state'] as const
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  providers: [amazonProvider as any], // eslint-disable-line @typescript-eslint/no-explicit-any
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  
  callbacks: {
    async jwt({ token, account, user }) {
      // 首次登录时保存 account 信息
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000
        token.sellerId = account.providerAccountId || account.seller_id
        token.userId = user.id
      }
      
      // 检查 access token 是否过期，如果过期则刷新
      if (token.accessTokenExpires && Date.now() > (token.accessTokenExpires as number)) {
        // TODO: 实现 token 刷新逻辑
        console.log('Access token expired, need to refresh')
      }
      
      return token
    },
    
    async session({ session, token }) {
      // 将 token 信息传递给 session
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.sellerId = token.sellerId as string
      
      return session
    },
    
    async signIn({ account }) {
      if (account?.provider === 'amazon') {
        try {
          // 验证是否为有效的卖家账户
          if (!account.providerAccountId) {
            console.error('No seller ID provided')
            return false
          }
          
          // 可以在这里添加额外的验证逻辑
          return true
        } catch (error) {
          console.error('Sign in error:', error)
          return false
        }
      }
      return true
    },
    
    async redirect({ url, baseUrl }) {
      // 如果是从授权成功回来，重定向到商品刊登页面
      if (url.startsWith(baseUrl)) {
        // 检查是否是授权回调
        if (url.includes('/api/auth/callback/amazon')) {
          return `${baseUrl}${process.env.DEFAULT_CALLBACK_URL || '/amazon-listing'}`
        }
        return url
      }
      // 默认重定向到商品刊登页面
      return `${baseUrl}${process.env.DEFAULT_CALLBACK_URL || '/amazon-listing'}`
    }
  },
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  
  debug: process.env.NODE_ENV === 'development',
  
  events: {
    async signIn({ user, account }) {
      // 保存 Amazon 特定的信息到用户记录
      if (account?.provider === 'amazon' && user?.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            // amazonSellerId: account.providerAccountId || account.seller_id,
            amazonMarketplaceId: process.env.AMAZON_MARKETPLACE_ID,
            amazonRegion: process.env.AMAZON_REGION
          }
        }).catch(console.error)
      }
    }
  }
}

// 导出辅助函数
export { generateStateToken, verifyStateToken }
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from '@/lib/prisma'
import type { NextAuthOptions } from 'next-auth'

// Amazon SP-API OAuth Provider 配置
const amazonProvider = {
  id: 'amazon',
  name: 'Amazon',
  type: 'oauth' as const,
  version: '2.0',
  
  clientId: process.env.AMAZON_OAUTH_CLIENT_ID,
  clientSecret: process.env.AMAZON_OAUTH_CLIENT_SECRET,
  
  // SP-API 专用授权端点
  authorization: {
    url: 'https://sellercentral.amazon.com/apps/authorize/consent',
    params: {
      application_id: process.env.AMAZON_APPLICATION_ID,
      ...(process.env.AMAZON_APP_IS_DRAFT === 'true' && { version: 'beta' })
    }
  },
  
  // Token 端点 - 用于交换授权码获取 Token
  token: {
    url: 'https://api.amazon.com/auth/o2/token',
    params: {
      grant_type: 'authorization_code'
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
    strategy: 'jwt'
  },
  
  callbacks: {
    async jwt({ token, account }) {
      // 首次登录时保存 account 信息
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = account.expires_at
        token.sellerId = account.providerAccountId
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
    }
  },
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  
  debug: process.env.NODE_ENV === 'development'
}
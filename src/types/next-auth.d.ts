// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    sellerId?: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      amazonSellerId?: string
      amazonMarketplaceId?: string
      amazonRegion?: string
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    amazonSellerId?: string
    amazonMarketplaceId?: string
    amazonRegion?: string
  }

  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    sellerId?: string
  }
}
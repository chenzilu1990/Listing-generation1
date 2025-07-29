import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    return NextResponse.json({
      session: session ? {
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          amazonSellerId: session.user?.amazonSellerId,
          amazonMarketplaceId: session.user?.amazonMarketplaceId,
          amazonRegion: session.user?.amazonRegion
        },
        accessToken: session.accessToken ? 'present' : 'missing',
        refreshToken: session.refreshToken ? 'present' : 'missing',
        sellerId: session.sellerId
      } : null,
      environment: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
        AMAZON_APPLICATION_ID: process.env.AMAZON_APPLICATION_ID ? 'set' : 'not set',
        AMAZON_REDIRECT_URI: process.env.AMAZON_REDIRECT_URI || 'not set',
        DEFAULT_CALLBACK_URL: process.env.DEFAULT_CALLBACK_URL || 'not set',
        NODE_ENV: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      error: 'Failed to get debug information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
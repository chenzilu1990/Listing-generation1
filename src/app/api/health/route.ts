import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 生产环境健康检查端点
 * 检查所有必需的配置和服务状态
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  
  console.log('🏥 Health check started at:', timestamp)
  
  const health = {
    timestamp,
    status: 'unknown',
    environment: process.env.NODE_ENV || 'unknown',
    checks: {
      environment_variables: {
        status: 'unknown' as 'unknown' | 'pass' | 'warn' | 'fail',
        details: {} as Record<string, unknown>
      },
      database: {
        status: 'unknown' as 'unknown' | 'pass' | 'warn' | 'fail',
        details: {} as Record<string, unknown>
      },
      amazon_api: {
        status: 'unknown' as 'unknown' | 'pass' | 'warn' | 'fail',
        details: {} as Record<string, unknown>
      }
    },
    recommendations: [] as string[]
  }
  
  // 环境变量检查
  console.log('🔧 Checking environment variables...')
  try {
    const envVars = {
      AMAZON_LWA_CLIENT_ID: !!process.env.AMAZON_LWA_CLIENT_ID,
      AMAZON_LWA_CLIENT_SECRET: !!process.env.AMAZON_LWA_CLIENT_SECRET,
      AMAZON_REDIRECT_URI: !!process.env.AMAZON_REDIRECT_URI,
      AMAZON_APPLICATION_ID: !!process.env.AMAZON_APPLICATION_ID,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_STATE_SECRET: !!process.env.JWT_STATE_SECRET,
      DEFAULT_CALLBACK_URL: !!process.env.DEFAULT_CALLBACK_URL,
    }
    
    const missingVars = Object.entries(envVars)
      .filter(([, exists]) => !exists)
      .map(([name]) => name)
    
    health.checks.environment_variables = {
      status: missingVars.length === 0 ? 'pass' : 'warn',
      details: {
        configured: envVars,
        missing: missingVars,
        values: {
          AMAZON_REDIRECT_URI: process.env.AMAZON_REDIRECT_URI,
          NEXTAUTH_URL: process.env.NEXTAUTH_URL,
          DEFAULT_CALLBACK_URL: process.env.DEFAULT_CALLBACK_URL,
          NODE_ENV: process.env.NODE_ENV
        }
      }
    }
    
    if (missingVars.length > 0) {
      health.recommendations.push(`配置缺失的环境变量: ${missingVars.join(', ')}`)
    }
    
    console.log('✅ Environment variables checked')
  } catch (error) {
    console.error('❌ Environment check failed:', error)
    health.checks.environment_variables.status = 'fail'
    health.checks.environment_variables.details = { error: error instanceof Error ? error.message : 'Unknown error' }
  }
  
  // 数据库连接检查
  console.log('💾 Checking database connection...')
  try {
    await prisma.$connect()
    const userCount = await prisma.user.count()
    const accountCount = await prisma.account.count()
    
    health.checks.database = {
      status: 'pass',
      details: {
        connected: true,
        userCount,
        accountCount,
        url: process.env.DATABASE_URL ? 'configured' : 'missing'
      }
    }
    
    console.log('✅ Database connection successful')
  } catch (dbError) {
    console.error('❌ Database check failed:', dbError)
    health.checks.database = {
      status: 'fail',
      details: {
        connected: false,
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        url: process.env.DATABASE_URL ? 'configured' : 'missing'
      }
    }
    health.recommendations.push('检查 DATABASE_URL 配置和数据库连接')
  } finally {
    try {
      await prisma.$disconnect()
    } catch (disconnectError) {
      console.warn('⚠️ Database disconnect warning:', disconnectError)
    }
  }
  
  // Amazon API 连通性检查
  console.log('🔗 Checking Amazon API connectivity...')
  try {
    // 测试 Amazon LWA token 端点的连通性
    const testResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'test_code',
        redirect_uri: process.env.AMAZON_REDIRECT_URI || '',
        client_id: process.env.AMAZON_LWA_CLIENT_ID || '',
        client_secret: process.env.AMAZON_LWA_CLIENT_SECRET || ''
      }).toString()
    })
    
    // 我们期望这会失败，因为我们使用的是测试代码
    // 但如果能连接到端点并返回错误，说明网络连接正常
    const responseText = await testResponse.text()
    
    health.checks.amazon_api = {
      status: testResponse.status === 400 ? 'pass' : 'warn', // 400 是期望的错误（无效的授权码）
      details: {
        endpoint_reachable: true,
        status: testResponse.status,
        expected_400: testResponse.status === 400,
        response_preview: responseText.substring(0, 200)
      }
    }
    
    if (testResponse.status !== 400) {
      health.recommendations.push('Amazon API 端点响应异常，检查网络连接')
    }
    
    console.log('✅ Amazon API connectivity checked')
  } catch (apiError) {
    console.error('❌ Amazon API check failed:', apiError)
    health.checks.amazon_api = {
      status: 'fail',
      details: {
        endpoint_reachable: false,
        error: apiError instanceof Error ? apiError.message : 'Unknown API error'
      }
    }
    health.recommendations.push('检查网络连接和 Amazon API 端点访问')
  }
  
  // 总体状态评估
  const statuses = Object.values(health.checks).map(check => check.status)
  if (statuses.every(status => status === 'pass')) {
    health.status = 'healthy'
  } else if (statuses.some(status => status === 'fail')) {
    health.status = 'unhealthy'
  } else {
    health.status = 'degraded'
  }
  
  console.log('🏥 Health check completed:', health.status)
  
  return NextResponse.json(health, {
    status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503
  })
}
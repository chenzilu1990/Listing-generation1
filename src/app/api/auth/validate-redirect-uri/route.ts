import { NextResponse } from 'next/server'
import { validateRedirectUri, formatValidationResult, generateAmazonConsoleGuide } from '@/lib/redirect-uri-validator'

export async function GET() {
  try {
    const validationResult = validateRedirectUri()
    
    return NextResponse.json({
      success: true,
      isValid: validationResult.isValid,
      validation: validationResult,
      formattedResult: formatValidationResult(validationResult),
      amazonConsoleGuide: generateAmazonConsoleGuide(),
      environment: {
        AMAZON_REDIRECT_URI: process.env.AMAZON_REDIRECT_URI || 'not set',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
        AMAZON_APPLICATION_ID: process.env.AMAZON_APPLICATION_ID ? 'configured' : 'not set',
        NODE_ENV: process.env.NODE_ENV || 'development',
        AMAZON_APP_IS_DRAFT: process.env.AMAZON_APP_IS_DRAFT || 'false'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Redirect URI validation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to validate redirect URI configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
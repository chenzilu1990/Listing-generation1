# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build production version
npm run start        # Start production server
npm run lint         # ESLint code checking

# Database Operations
npx prisma studio              # Open database management interface
npx prisma migrate dev         # Create and apply new migration
npx prisma generate           # Generate Prisma client (run after schema changes)
npx prisma db push            # Push schema changes without migration
```

## Architecture Overview

This is an Amazon SP-API product listing system built with Next.js 15 App Router, featuring a sophisticated dual-authentication flow for Amazon seller integration.

### Core Architecture

- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with custom Amazon SP-API integration
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js with custom Amazon OAuth provider
- **Amazon Integration**: Official SP-API SDK with custom wrapper service

### Key Components

1. **Authentication System** (`src/lib/auth.ts`)
   - Custom Amazon OAuth provider for SP-API access
   - JWT-based state token generation for CSRF protection
   - Session management with automatic token refresh
   - Dual authentication flow: NextAuth + direct SP-API authorization

2. **SP-API Service** (`src/services/amazon-sp-api.ts`)
   - Singleton service with session-based instantiation
   - Automatic access token refresh using stored refresh tokens
   - Multi-marketplace support (NA, EU, FE regions)
   - Product listing operations (create, update, delete, status check)

3. **Database Schema** (`prisma/schema.prisma`)
   - NextAuth.js standard tables (User, Account, Session)
   - Product model with comprehensive Amazon listing attributes
   - User-Amazon seller relationship with marketplace metadata

## Amazon SP-API Integration Architecture

### Authentication Flow
The system implements Amazon's website authorization workflow with two paths:

1. **NextAuth Integration** (`/api/auth/[...nextauth]`)
   - Standard OAuth flow through NextAuth.js
   - Automatic session management
   - Simplified user experience

2. **Direct SP-API Authorization** (`/api/auth/amazon-login`, `/api/auth/amazon-callback`)
   - Compliant with Amazon's SP-API website authorization workflow
   - State parameter validation for CSRF protection
   - Manual token exchange and storage
   - Supports draft applications with `version=beta` parameter

### Token Management Strategy
- **Access Tokens**: Short-lived, automatically refreshed when within 5 minutes of expiry
- **Refresh Tokens**: Long-lived, stored in database, used for access token renewal
- **State Tokens**: JWT-signed with 10-minute expiry for authorization flow security

### SP-API Service Patterns

```typescript
// Session-based instantiation
const apiService = await AmazonSPAPIService.fromSession()

// Manual credential instantiation
const apiService = new AmazonSPAPIService({
  refresh_token: "...",
  client_id: "...",
  seller_id: "..."
})
```

## Environment Configuration

### Required Variables
```env
# Amazon SP-API Core
AMAZON_LWA_CLIENT_ID="your_client_id"
AMAZON_LWA_CLIENT_SECRET="your_client_secret"
AMAZON_APPLICATION_ID="your_application_id"

# OAuth Flow
AMAZON_REDIRECT_URI="http://localhost:3001/api/auth/amazon-callback"
AMAZON_APP_IS_DRAFT="true"  # For draft applications

# Security
JWT_STATE_SECRET="min_32_character_secret"
NEXTAUTH_SECRET="your_nextauth_secret"

# Marketplace Configuration
AMAZON_MARKETPLACE_ID="ATVPDKIKX0DER"  # US marketplace
AMAZON_REGION="na"  # North America
```

### Marketplace Configuration
- **NA Region**: US (ATVPDKIKX0DER), CA (A2EUQ1WTGCTBG2), MX (A1AM78C64UM0Y8)
- **EU Region**: UK (A1F83G8C2ARO7P), DE (A1PA6795UKMFR9), FR (A13V1IB3VIYZZH), etc.
- **FE Region**: JP (A1VC38T7YXB528), AU (A39IBJ37TRP1C6), SG (A19VAU5U5O7RUS)

## Key API Endpoints

### Authentication
- `GET /api/auth/amazon-login` - Initiates SP-API authorization flow
- `GET /api/auth/amazon-callback` - Handles Amazon authorization response
- `GET /api/auth/[...nextauth]` - NextAuth.js endpoints

### Business Logic
- `POST /api/amazon-listing` - Create product listing
- `GET /api/amazon-listing` - Retrieve product listings

### Testing & Debugging
- `GET /auth/test` - Authorization flow testing interface
- `GET /api/auth/debug` - Debug endpoint for session and environment info
- `GET /api/auth/sp-api-status` - Check SP-API credentials and connection status

## Database Architecture

### User-Amazon Relationship
```sql
-- Users store Amazon seller metadata
User {
  amazonSellerId      String?  -- SP-API seller identifier
  amazonMarketplaceId String?  -- Default marketplace
  amazonRegion        String?  -- Default region (na/eu/fe)
}

-- Products linked to users with full Amazon attributes
Product {
  userId              String   -- Foreign key to User
  sku                 String   -- Unique product identifier
  -- Amazon-specific fields for SP-API compliance
}
```

### Session Management
NextAuth.js handles session persistence with custom extensions for Amazon token storage in the Account model.

## Security Implementation

### CSRF Protection
- State parameter validation using JWT tokens
- 10-minute token expiry for authorization flows
- Cryptographic nonce inclusion in state tokens

### Token Security
- Refresh tokens stored encrypted in database
- Access tokens never persisted, regenerated as needed
- Automatic token cleanup on expiry

### Request Security
- Referrer-Policy: no-referrer for all auth endpoints
- HTTPS enforcement in production
- Secure cookie settings for session management

## Development Workflow

### Database Changes
1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Run `npx prisma generate` to update client

### Amazon Integration Testing
1. Use `/auth/test` page for authorization flow testing
2. Use `/api/auth/debug` endpoint to check session status and environment configuration
3. Verify environment variables are properly configured
4. Test both NextAuth and direct authorization flows
5. Check token refresh mechanisms
6. Monitor console logs for detailed debugging information during authorization flow

### Local Development Setup
1. Copy `.env.example` to `.env`
2. Configure Amazon Developer Console application
3. Set redirect URIs to match local environment
4. Initialize database with `npx prisma migrate dev`

## Common Patterns

### Error Handling in SP-API
```typescript
try {
  const result = await apiService.createOrUpdateListing(product, marketplaceId)
} catch (error) {
  // Handle SP-API specific errors
  console.error('SP-API Error:', error)
}
```

### Session-based Service Instantiation
```typescript
// Always prefer session-based instantiation in API routes
const apiService = await AmazonSPAPIService.fromSession()
const isValid = await apiService.validateCredentials()
```

### Multi-marketplace Operations
Products can be listed across different marketplaces by changing the `marketplaceId` parameter while maintaining the same seller credentials.
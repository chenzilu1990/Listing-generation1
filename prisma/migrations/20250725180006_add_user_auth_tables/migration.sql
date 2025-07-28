/*
  Warnings:

  - Added the required column `userId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "amazonSellerId" TEXT,
    "amazonMarketplaceId" TEXT,
    "amazonRegion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "upc" TEXT,
    "quantity" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "bulletPoint1" TEXT NOT NULL,
    "bulletPoint2" TEXT NOT NULL,
    "bulletPoint3" TEXT NOT NULL,
    "bulletPoint4" TEXT,
    "bulletPoint5" TEXT,
    "description" TEXT NOT NULL,
    "keywords" TEXT,
    "images" JSONB NOT NULL DEFAULT [],
    "variationTheme" TEXT,
    "color" TEXT,
    "size" TEXT,
    "material" TEXT,
    "packageLength" REAL,
    "packageWidth" REAL,
    "packageHeight" REAL,
    "packageWeight" REAL,
    "packageUnit" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- 创建默认用户
INSERT INTO "User" ("id", "name", "email", "createdAt", "updatedAt") VALUES ('default_user', 'Default User', 'default@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 将现有产品关联到默认用户
INSERT INTO "new_Product" ("brand", "bulletPoint1", "bulletPoint2", "bulletPoint3", "bulletPoint4", "bulletPoint5", "category", "color", "createdAt", "currency", "description", "id", "images", "keywords", "material", "packageHeight", "packageLength", "packageUnit", "packageWeight", "packageWidth", "price", "quantity", "size", "sku", "status", "subcategory", "title", "upc", "updatedAt", "variationTheme", "userId") SELECT "brand", "bulletPoint1", "bulletPoint2", "bulletPoint3", "bulletPoint4", "bulletPoint5", "category", "color", "createdAt", "currency", "description", "id", "images", "keywords", "material", "packageHeight", "packageLength", "packageUnit", "packageWeight", "packageWidth", "price", "quantity", "size", "sku", "status", "subcategory", "title", "upc", "updatedAt", "variationTheme", 'default_user' FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

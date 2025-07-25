-- CreateTable
CREATE TABLE "Product" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

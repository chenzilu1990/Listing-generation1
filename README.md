# 亚马逊商品刊登系统

这是一个基于 Next.js 15 构建的亚马逊商品刊登系统，支持直接将商品刊登到亚马逊市场。

## 功能特点

- 🚀 **直接刊登到亚马逊**：使用官方 SP-API 将商品直接刊登到亚马逊市场
- 🔐 **LWA OAuth 登录**：支持 Amazon Login with Amazon 自动授权，无需手动配置复杂凭证
- 🌍 **多市场支持**：支持美国、欧洲、日本等多个亚马逊市场
- 💾 **本地数据备份**：商品信息同时保存到本地数据库
- ⚙️ **可视化配置**：通过设置页面管理 API 凭证
- 📊 **状态跟踪**：实时跟踪商品刊登状态
- 🖼️ **图片上传**：支持多图片上传和管理
- 👥 **多用户支持**：每个用户可以管理自己的商品和凭证

## 技术栈

- **前端**：Next.js 15, React 19, TypeScript, Tailwind CSS
- **后端**：Next.js API Routes
- **数据库**：SQLite + Prisma ORM
- **亚马逊集成**：Amazon SP-API

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的亚马逊 API 凭证：

```env
# 数据库
DATABASE_URL="file:./dev.db"

# 亚马逊 SP-API 凭证
AMAZON_LWA_CLIENT_ID="your_lwa_client_id"
AMAZON_LWA_CLIENT_SECRET="your_lwa_client_secret"
AMAZON_LWA_REFRESH_TOKEN="your_lwa_refresh_token"
AMAZON_SELLER_ID="your_seller_id"
AMAZON_MARKETPLACE_ID="ATVPDKIKX0DER"  # 美国市场
AMAZON_REGION="na"  # 北美
```

### 3. 初始化数据库

```bash
npx prisma migrate dev --name init
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 获取亚马逊 API 凭证

### 方式一：LWA OAuth 自动授权（推荐）

1. 登录 [Amazon Seller Central](https://sellercentral.amazon.com/)
2. 转到 **应用和服务** > **开发应用**
3. 创建开发者资料和 SP-API 应用
4. 在应用设置中配置：
   - **重定向 URI**: `http://localhost:3001/api/auth/callback/amazon`
   - **登录 URI**: `http://localhost:3001/auth/signin`
5. 配置以下环境变量：
   ```env
   AMAZON_OAUTH_CLIENT_ID="your_oauth_client_id"
   AMAZON_OAUTH_CLIENT_SECRET="your_oauth_client_secret"
   AMAZON_APPLICATION_ID="your_application_id"
   AMAZON_APP_IS_DRAFT="true"  # 如果是 Draft 应用
   ```
6. 在系统中点击"使用 Amazon 登录"按钮自动获取授权

**重要提示**：
- Application ID 可在 Amazon Developer Console 应用列表中找到
- Draft 状态的应用必须设置 `AMAZON_APP_IS_DRAFT="true"`
- 确保重定向 URI 与环境变量中的 `NEXTAUTH_URL` 匹配

### 方式二：手动配置 SP-API 凭证

1. 在 Seller Central 获取以下凭证：
   - **LWA Client ID**
   - **LWA Client Secret**
   - **Refresh Token**
   - **Seller ID**
2. 在设置页面手动输入凭证

详细步骤请参考 [Amazon SP-API 文档](https://developer-docs.amazon.com/sp-api/docs/registering-your-application)。

## 页面说明

- **首页** (`/`)：系统概览和导航，显示登录状态
- **登录** (`/auth/signin`)：Amazon OAuth 登录页面
- **商品刊登** (`/amazon-listing`)：创建新商品刊登（需要登录）
- **商品列表** (`/listings`)：查看所有已刊登商品
- **设置** (`/settings`)：配置和验证 API 凭证

## 市场支持

系统支持以下亚马逊市场：

| 市场 | Marketplace ID | 区域 |
|------|----------------|------|
| 美国 | ATVPDKIKX0DER | na |
| 加拿大 | A2EUQ1WTGCTBG2 | na |
| 墨西哥 | A1AM78C64UM0Y8 | na |
| 英国 | A1F83G8C2ARO7P | eu |
| 德国 | A1PA6795UKMFR9 | eu |
| 法国 | A13V1IB3VIYZZH | eu |
| 意大利 | APJ6JRA9NG5V4 | eu |
| 西班牙 | A1RKKUPIHCS9HS | eu |
| 日本 | A1VC38T7YXB528 | fe |
| 澳大利亚 | A39IBJ37TRP1C6 | fe |

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 数据库相关
npx prisma studio          # 打开数据库管理界面
npx prisma migrate dev      # 创建新的数据库迁移
npx prisma generate        # 生成 Prisma 客户端
```

## 故障排除

### OAuth 授权页面问题

如果跳转到 Amazon 后没有看到授权信息：

1. **检查配置**：访问 `/api/auth/test-oauth` 检查配置状态
2. **验证 Application ID**：确保使用的是正确的应用 ID
3. **确认应用状态**：Draft 应用需要 `version=beta` 参数
4. **检查重定向 URI**：必须与 Amazon 应用配置完全匹配

### 常见错误解决

- **"无法找到应用程序"**：检查 `AMAZON_APPLICATION_ID` 是否正确
- **"访问被拒绝"**：确认您的账户有卖家权限
- **"OAuth 回调失败"**：检查重定向 URI 配置

## 注意事项

1. **测试环境**：建议先在沙盒环境测试，避免影响真实商品
2. **API 限制**：注意亚马逊 SP-API 的调用频率限制
3. **权限要求**：确保您的开发者账户具有必要的 API 权限
4. **安全性**：在生产环境中，API 凭证应保存在服务器端环境变量中

## 许可证

MIT License

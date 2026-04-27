# 下班来鸭顾客端小程序 - Taro重构部署指南

## 项目概述

本项目是基于Taro v4 + React重构的微信小程序顾客端，采用以下技术栈：

- **框架**: Taro v4 + React 18
- **样式**: SCSS
- **请求库**: Axios (封装)
- **状态管理**: React Context
- **构建工具**: @tarojs/cli

## 项目结构

```
apps/customer/
├── src/
│   ├── app.tsx                 # 应用入口
│   ├── app.config.ts           # 应用配置
│   ├── components/             # 公共组件
│   ├── context/                # React Context
│   ├── network/                # 网络请求
│   │   └── request.ts         # 请求封装
│   ├── pages/                  # 页面
│   │   ├── home/              # 首页
│   │   ├── cart/              # 购物车
│   │   ├── checkout/          # 结算页
│   │   ├── login/             # 登录页
│   │   ├── orders/            # 订单
│   │   ├── product-detail/     # 商品详情
│   │   ├── profile/           # 个人中心
│   │   ├── reservations/      # 预约
│   │   ├── signin/            # 签到
│   │   ├── points-mall/        # 积分商城
│   │   └── points-history/     # 积分历史
│   ├── styles/                 # 全局样式
│   ├── utils/                 # 工具函数
│   │   └── auth.ts            # Token缓存管理
│   └── shared/                 # 共享类型定义
├── dist/                       # 编译输出目录
├── .github/
│   └── workflows/              # CI/CD配置
├── taro.config.ts             # Taro配置
├── tsconfig.json               # TypeScript配置
├── preview.js                  # 预览脚本
└── package.json
```

## Token缓存机制

### 核心功能 (`src/utils/auth.ts`)

```typescript
// 获取Token
const token = getToken();

// 存储Token (自动处理内存和storage)
setToken(token, expireInSeconds, refreshToken);

// 清除Token
clearToken();

// 获取Token并自动刷新（如果即将过期）
const freshToken = await getTokenWithRefresh();

// 检查是否已认证
if (isAuthenticated()) {
  // 已登录
}

// 检查Token是否即将过期（5分钟内）
if (isTokenExpiringSoon()) {
  // Token即将过期
}
```

### 请求集成

网络请求模块已集成自动token刷新：

```typescript
import { get, post } from '@/network/request';

// 默认自动刷新token
const data = await get('/api/user/info');

// 跳过自动刷新
const data = await get('/api/user/info', { autoRefreshToken: false });
```

## 本地开发

### 环境要求

- Node.js >= 18
- npm / pnpm / yarn

### 安装依赖

```bash
cd apps/customer
npm install
# 或
pnpm install
```

### 开发预览

```bash
# 启动微信小程序开发
npm run dev:weapp

# 启动H5开发
npm run dev:h5
```

### 编译构建

```bash
# 编译微信小程序
npm run build:weapp

# 编译H5
npm run build:h5
```

## 真机预览

### 方式一：本地预览（需要微信私钥）

1. 确保已安装微信开发者工具
2. 获取小程序私钥（从微信公众平台）
3. 将私钥文件保存为 `private.key`
4. 执行预览：

```bash
npm run build:preview
```

### 方式二：GitHub Actions CI/CD

1. Fork或复制本仓库到GitHub
2. 在仓库设置中添加Secrets：
   - `WECHAT_APPID`: 小程序AppID
   - `WECHAT_PRIVATE_KEY`: 私钥内容（完整内容，不是路径）

3. 推送代码触发Workflow，或手动运行 `Build and Preview WeChat Mini Program`

4. 查看Actions运行结果，下载预览二维码

### 预览脚本参数

```bash
# 使用默认配置
node preview.js

# 指定AppID
node preview.js --appid wxxx

# 指定私钥路径
node preview.js --key ./my-key.pem

# 指定版本和描述
node preview.js --version 1.0.0.20240101 --desc "测试版本"
```

## 页面路由

| 页面 | 路径 |
|------|------|
| 首页 | `/pages/home/index` |
| 登录 | `/pages/login/index` |
| 商品详情 | `/pages/product-detail/index` |
| 购物车 | `/pages/cart/index` |
| 结算 | `/pages/checkout/index` |
| 订单列表 | `/pages/orders/index` |
| 订单详情 | `/pages/order-detail/index` |
| 预约列表 | `/pages/reservations/index` |
| 新建预约 | `/pages/reservations/new/index` |
| 个人中心 | `/pages/profile/index` |
| 签到 | `/pages/signin/index` |
| 签到盒子 | `/pages/signin/box/index` |
| 签到历史 | `/pages/signin/history/index` |
| 积分商城 | `/pages/points-mall/index` |
| 积分历史 | `/pages/points-history/index` |
| 消息列表 | `/pages/notifications/index` |
| 消息详情 | `/pages/notifications/detail` |

## 配置说明

### AppID配置

项目使用AppID: `wxc48691a5b138cfdb`

如需更换，在以下文件中修改：

1. `project.config.json`
2. `preview.js`
3. `.github/workflows/build-preview.yml`

### API地址配置

在 `taro.config.ts` 中配置：

```typescript
defineConstants: {
  API_BASE_URL: JSON.stringify('https://cozejifen.haiei.cn/api'),
  WS_BASE_URL: JSON.stringify('wss://cozejifen.haiei.cn/events'),
},
```

## 常见问题

### 1. npm install 超时

建议使用淘宝镜像：
```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### 2. 预览上传失败

- 检查私钥是否正确
- 确保AppID与私钥匹配
- 检查网络连接

### 3. 编译报错

- 确保Node版本 >= 18
- 删除 node_modules 重新安装
- 检查是否有未匹配的依赖版本

## 部署流程

1. **开发测试**: 本地开发 `npm run dev:weapp`
2. **编译构建**: `npm run build:weapp`
3. **真机预览**: `npm run preview` 或 GitHub Actions
4. **提交审核**: 微信开发者工具上传代码
5. **发布上线**: 微信公众平台提交审核

## 技术支持

如有问题，请检查：

- [Taro文档](https://taro-docs.jd.com/)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [miniprogram-ci文档](https://www.npmjs.com/package/miniprogram-ci)

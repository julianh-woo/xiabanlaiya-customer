# 下班来鸭顾客端小程序 - 开发说明

## 项目概述
基于 Taro 3 + React + TypeScript 的顾客端小程序，支持商品浏览、购物车、订单管理等功能。

## 技术栈
- **框架**: Taro 3.x
- **UI**: React + TypeScript
- **网络**: Taro.request
- **样式**: SCSS

## 目录结构
```
src/
├── pages/                 # 页面
│   ├── home/             # 首页（商品列表、Banner、分类）
│   ├── cart/            # 购物车
│   ├── checkout/        # 结算页
│   ├── login/           # 登录页（🆕）
│   ├── orders/          # 订单列表
│   ├── order-detail/    # 订单详情
│   ├── reservations/    # 预约
│   ├── profile/         # 个人中心
│   ├── notifications/   # 通知
│   ├── points-history/  # 积分历史
│   └── points-mall/     # 积分商城
├── components/          # 组件
│   ├── spec-selector/   # 规格选择器（三种计价模式）
│   ├── quick-rebuy/     # 快速复购（🆕）
│   ├── product-card/    # 商品卡片
│   ├── delivery-mode-selector/  # 配送方式选择
│   └── ui/             # 基础UI组件
├── context/             # 状态管理
│   ├── CartContext.tsx  # 购物车状态
│   └── LedgerContext.tsx # 积分账本
├── network/             # 网络请求
│   ├── request.ts       # API请求封装
│   └── ws.ts           # WebSocket
├── shared/             # 共享类型（链接到根目录shared）
└── styles/             # 全局样式
```

## API 配置
- **Base URL**: `http://175.27.158.118:5000/api`
- **产品列表**: `GET /products?status=active`
- **创建订单**: `POST /orders`
- **登录**: `POST /auth/login`, `POST /auth/wechat`

## 已完成功能

### 1. 首页 (pages/home)
- 顶部品牌 Banner
- 营业状态提示
- 三个 Tab 切换：现货 / 常购 / 新品
- 商品网格列表（带标签：刚出锅、新品、热销）
- 规格选择器集成
- 购物车浮动按钮
- 真实 API 调用 + Mock 数据兜底

### 2. 规格选择器 (components/spec-selector)
三种计价模式：
- **固定份量 (fixed)**: 直接选择数量
- **按斤称重 (weight)**: 选择重量（支持小数）
- **自定义规格 (custom)**: 多选项组（桶型/口味/加料等）

### 3. 购物车 (pages/cart)
- 商品列表（图片、名称、规格、单价、数量）
- 数量/重量调整（支持小数）
- 单选/全选
- 删除商品
- 总价计算
- 结算跳转

### 4. 结算页 (pages/checkout)
- 配送方式：自取 / 本地配送 / 快递
- 联系人信息（姓名、电话）
- 地址选择（微信收货地址 API）
- 支付方式：到店付款 / 积分支付
- 费用明细（商品金额 + 配送费）
- 真实 API 调用创建订单

### 5. 登录页 (pages/login) 🆕
- 手机号 + 验证码登录
- 微信授权登录
- 记住登录状态
- 跳过登录

### 6. 快速复购 (components/quick-rebuy) 🆕
- 一键复购常购商品
- 单个添加 / 全部添加
- 真实 API 支持

### 7. 页面路由 (app.config.ts)
已添加：
- `pages/login/index`
- 微信地址选择权限

## 使用说明

### 开发调试
```bash
cd projects/下班来鸭/apps/customer
npm install
npm run dev:weapp  # 微信小程序
npm run dev:h5     # H5
```

### 添加商品到购物车
```typescript
import { useCart } from '@/context/CartContext';

const { addItem } = useCart();

addItem({
  productId: 'p001',
  productName: '麻辣鸭脖',
  productImage: 'https://...',
  pricingType: 'fixed', // 'weight' | 'custom'
  quantity: 2,
  unitPrice: 28,
  pricingSnapshot: { type: 'fixed', price: 28, unit: '份' },
});
```

### 规格选择器使用
```typescript
<SpecSelector
  product={product}
  visible={showSelector}
  onClose={() => setShowSelector(false)}
  onAdd={(item) => {
    addItem(item);
  }}
/>
```

## 待完善功能
- [ ] 商品详情页完整实现
- [ ] 订单列表状态筛选
- [ ] 预约功能完整实现
- [ ] 积分商城完整实现
- [ ] 通知功能完整实现
- [ ] 个人中心完整实现

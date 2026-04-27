import React, { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { Product, isFixedPricing } from '@/shared/types/product';
import { DailyInventory } from '@/shared/types/inventory';
import { ProductCard } from '@/components/product-card';
import { StockBadge } from '@/components/stock-badge';
import { Badge, Empty, Loading } from '@/components/ui';
import { useCart } from '@/context/CartContext';
import { SpecSelector } from '@/components/spec-selector';
import { SelectedOption } from '@/context/CartContext';
import { get as apiGet } from '@/network/request';
import './index.scss';

// API 基础配置
const API_BASE = 'https://cozejifen.haiei.cn/api';
const TENANT_ID = 'default';

// 接口响应类型
interface ProductWithInventory extends Product {
  dailyInventory?: DailyInventory;
}

interface ShopStatus {
  isOpen: boolean;
  message?: string;
}

interface ProductsResponse {
  list: Product[];
  total: number;
}

interface InventoryResponse {
  stockQuantity: number;
  soldQuantity: number;
  date: string;
}

// 分类映射
const CATEGORY_MAPPING: Record<string, string> = {
  '现货': 'all',
  '常购': 'frequent',
  '新品': 'new',
};

const Home: React.FC = () => {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithInventory[]>([]);
  const [categories] = useState(['现货', '常购', '新品']);
  const [activeCategory, setActiveCategory] = useState('现货');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusinessOpen, setIsBusinessOpen] = useState<ShopStatus>({ isOpen: true });
  const [error, setError] = useState<string | null>(null);
  const [currentProduct, setCurrentProduct] = useState<ProductWithInventory | null>(null);
  const [showSpecSelector, setShowSpecSelector] = useState(false);

  const { addItem, getItemCount } = useCart();
  const cartCount = getItemCount();

  useEffect(() => {
    fetchShopStatus();
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [activeCategory, products]);

  /**
   * 获取店铺营业状态
   */
  const fetchShopStatus = async () => {
    try {
      const res = await apiGet<ShopStatus>('/shop/status', {
        tenantId: TENANT_ID,
      });
      if (res.data) {
        setIsBusinessOpen({
          isOpen: res.data.isOpen ?? true,
          message: res.data.message,
        });
      }
    } catch (err) {
      console.error('获取店铺状态失败:', err);
      // 默认营业
      setIsBusinessOpen({ isOpen: true });
    }
  };

  /**
   * 获取商品列表（含今日库存）
   */
  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiGet<ProductsResponse>('/products', {
        params: { status: 'active' },
        tenantId: TENANT_ID,
      });

      if (res.data?.list) {
        // 为每个商品获取库存信息
        const productsWithInventory = await Promise.all(
          res.data.list.map(async (product) => {
            try {
              const today = new Date().toISOString().split('T')[0];
              const inventoryRes = await apiGet<InventoryResponse>(
                `/inventory/daily`,
                {
                  params: {
                    productId: product.id,
                    date: today,
                  },
                  tenantId: TENANT_ID,
                }
              );
              return {
                ...product,
                dailyInventory: inventoryRes.data ? {
                  id: '',
                  tenantId: product.tenantId,
                  productId: product.id,
                  date: today,
                  stockQuantity: inventoryRes.data.stockQuantity,
                  soldQuantity: inventoryRes.data.soldQuantity,
                  createdAt: '',
                  updatedAt: '',
                } : undefined,
              };
            } catch {
              return product;
            }
          })
        );
        setProducts(productsWithInventory);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('获取商品列表失败:', err);
      setError('加载商品失败，请下拉刷新');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 根据分类筛选商品
   */
  const filterProducts = useCallback(() => {
    if (activeCategory === '现货') {
      setFilteredProducts(products);
    } else if (activeCategory === '新品') {
      // 7天内上架或带有"新品"标签
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      setFilteredProducts(
        products.filter((p) => {
          const isNewTag = p.tags?.includes('新品');
          const isNewDate = new Date(p.createdAt) >= sevenDaysAgo;
          return isNewTag || isNewDate;
        })
      );
    } else if (activeCategory === '常购') {
      // 按销量排序，取前10
      const sorted = [...products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
      setFilteredProducts(sorted.slice(0, 10));
    }
  }, [activeCategory, products]);

  /**
   * 下拉刷新
   */
  const handleRefresh = async () => {
    await Promise.all([fetchShopStatus(), fetchProducts()]);
    Taro.stopPullDownRefresh();
  };

  /**
   * 添加商品到购物车
   */
  const handleAddToCart = (product: ProductWithInventory) => {
    if (isFixedPricing(product.pricingConfig)) {
      // 固定价格直接加购
      addItem({
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0]?.url,
        pricingType: product.pricingType,
        quantity: 1,
        unitPrice: product.pricingConfig.price,
        pricingSnapshot: product.pricingConfig,
      });
      Taro.showToast({ title: '已加入购物车', icon: 'success' });
    } else {
      // 其他类型显示规格选择器
      setCurrentProduct(product);
      setShowSpecSelector(true);
    }
  };

  /**
   * 查看商品详情
   */
  const handleViewDetail = (product: ProductWithInventory) => {
    Taro.navigateTo({
      url: `/pages/product-detail/index?id=${product.id}`,
    });
  };

  /**
   * 规格选择器确认添加
   */
  const handleSpecAdd = (item: {
    productId: string;
    productName: string;
    productImage?: string;
    pricingType: 'fixed' | 'weight' | 'custom';
    quantity: number;
    weight?: number;
    selectedOptions?: SelectedOption[];
    unitPrice: number;
    specs?: Record<string, string | number>;
    pricingSnapshot: Product['pricingConfig'];
  }) => {
    addItem(item as Parameters<typeof addItem>[0]);
    Taro.showToast({ title: '已加入购物车', icon: 'success' });
    setShowSpecSelector(false);
  };

  /**
   * 获取库存数量
   */
  const getAvailableQuantity = (product: ProductWithInventory): number | undefined => {
    if (!product.dailyInventory) return undefined;
    return product.dailyInventory.stockQuantity - product.dailyInventory.soldQuantity;
  };

  /**
   * 渲染商品卡片
   */
  const renderProductCard = (product: ProductWithInventory) => {
    const available = getAvailableQuantity(product);
    const isSoldOut = available !== undefined && available <= 0;

    return (
      <view key={product.id} className="product-wrapper">
        <ProductCard
          product={product}
          onClick={() => handleViewDetail(product)}
          onAdd={() => !isSoldOut && handleAddToCart(product)}
        />
        {isSoldOut && (
          <view className="sold-out-overlay">
            <text>售罄</text>
          </view>
        )}
      </view>
    );
  };

  return (
    <view className="home-page">
      {/* 顶部状态栏 */}
      {!isBusinessOpen.isOpen && (
        <view className="closed-banner">
          <text>{isBusinessOpen.message || '店铺休息中'}</text>
        </view>
      )}

      {/* 分类标签 */}
      <view className="category-tabs">
        {categories.map((category) => (
          <view
            key={category}
            className={`category-tab ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            <text>{category}</text>
          </view>
        ))}
      </view>

      {/* 商品列表 */}
      <scroll-view
        className="product-list"
        scroll-y
        enable-back-to-top
        onRefresherRefresh={handleRefresh}
        refresher-enabled
        refresher-triggered={isLoading}
      >
        {isLoading && products.length === 0 ? (
          <Loading text="加载中..." />
        ) : error ? (
          <Empty text={error} />
        ) : filteredProducts.length === 0 ? (
          <Empty text="暂无商品" />
        ) : (
          <view className="product-grid">
            {filteredProducts.map(renderProductCard)}
          </view>
        )}
      </scroll-view>

      {/* 购物车悬浮按钮 */}
      {cartCount > 0 && (
        <view
          className="cart-float-btn"
          onClick={() => Taro.switchTab({ url: '/pages/cart/index' })}
        >
          <text className="cart-icon">🛒</text>
          <Badge value={cartCount} max={99} />
        </view>
      )}

      {/* 规格选择器 */}
      {currentProduct && (
        <SpecSelector
          product={currentProduct}
          visible={showSpecSelector}
          onClose={() => setShowSpecSelector(false)}
          onAdd={handleSpecAdd}
        />
      )}
    </view>
  );
};

export default Home;

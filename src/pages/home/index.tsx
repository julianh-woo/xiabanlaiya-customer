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
import { get as apiGet } from '@/shared/network/request';
import './index.scss';

// API 基础配置
const API_BASE = 'http://175.27.158.118:5000/api';
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
  list: ProductWithInventory[];
  total: number;
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
      const res = await apiGet<ShopStatus>(`/shop/status`, {
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
      const res = await apiGet<ProductsResponse>(`/products`, {
        params: { status: 'active', tenantId: TENANT_ID },
        tenantId: TENANT_ID,
      });

      if (res.data?.list) {
        // 为每个商品获取库存信息
        const productsWithInventory = await Promise.all(
          res.data.list.map(async (product) => {
            try {
              const today = new Date().toISOString().split('T')[0];
              const inventoryRes = await apiGet<DailyInventory>(
                `/inventory/daily`,
                {
                  params: {
                    productId: product.id,
                    date: today,
                    tenantId: TENANT_ID,
                  },
                  tenantId: TENANT_ID,
                }
              );
              return {
                ...product,
                dailyInventory: inventoryRes.data,
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
   * 获取商品库存数量
   */
  const getStockQuantity = (product: ProductWithInventory): number | undefined => {
    if (!product.dailyInventory) return undefined;
    return product.dailyInventory.stockQuantity - product.dailyInventory.soldQuantity;
  };

  /**
   * 获取商品标签
   */
  const getProductTags = (product: ProductWithInventory): string[] => {
    const tags = product.tags || [];
    const stockQty = getStockQuantity(product);

    // 判断是否"刚出锅"：销量高且不是新品
    if (
      (product.salesCount || 0) > 50 &&
      !tags.includes('新品') &&
      new Date(product.createdAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ) {
      tags.push('刚出锅');
    }

    return tags;
  };

  return (
    <view className="home-page">
      {/* 顶部店铺状态 */}
      {!isBusinessOpen.isOpen && (
        <view className="business-closed-banner">
          <text>店铺休息中 · {isBusinessOpen.message || '请稍后再来'}</text>
        </view>
      )}

      {/* 分类标签 */}
      <view className="category-tabs">
        {categories.map((cat) => (
          <view
            key={cat}
            className={`category-tab ${activeCategory === cat ? 'category-tab--active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            <text>{cat}</text>
          </view>
        ))}
      </view>

      {/* 商品列表 */}
      {isLoading ? (
        <Loading text="加载中..." />
      ) : error ? (
        <view className="error-state">
          <text>{error}</text>
          <view className="retry-btn" onClick={fetchProducts}>
            <text>重试</text>
          </view>
        </view>
      ) : filteredProducts.length === 0 ? (
        <Empty text="暂无商品" />
      ) : (
        <scroll-view
          className="product-list"
          scroll-y
          onScrollToLower={handleRefresh}
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              stock={getStockQuantity(product)}
              tags={getProductTags(product)}
              onClick={() => handleViewDetail(product)}
              onAddCart={() => handleAddToCart(product)}
            />
          ))}
        </scroll-view>
      )}

      {/* 购物车数量 */}
      {cartCount > 0 && (
        <view className="cart-float" onClick={() => Taro.switchTab({ url: '/pages/cart/index' })}>
          <text className="cart-float__count">{cartCount > 99 ? '99+' : cartCount}</text>
        </view>
      )}

      {/* 规格选择器弹窗 */}
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

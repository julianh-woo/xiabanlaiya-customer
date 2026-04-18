import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { 
  Product, 
  isFixedPricing, 
  isWeightPricing, 
  isCustomPricing,
  PricingConfig 
} from '@/shared/types/product';
import { DailyInventory } from '@/shared/types/inventory';
import { Button, Price, Tag, Loading, Empty } from '@/components/ui';
import { StockBadge } from '@/components/stock-badge';
import { SpecSelector } from '@/components/spec-selector';
import { useCart } from '@/context/CartContext';
import { SelectedOption } from '@/context/CartContext';
import { get as apiGet } from '@/shared/network/request';
import { calculateWeightPrice } from '@/shared/lib/price-calculator';
import './index.scss';

// API 基础配置
const API_BASE = 'http://175.27.158.118:5000/api';
const TENANT_ID = 'default';

interface ProductDetailResponse {
  product: Product;
  dailyInventory?: DailyInventory;
}

const ProductDetail: React.FC = () => {
  const [product, setProduct] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<DailyInventory | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSpecSelector, setShowSpecSelector] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const { addItem } = useCart();

  useEffect(() => {
    fetchProductDetail();
  }, []);

  /**
   * 获取商品详情（含今日库存）
   */
  const fetchProductDetail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 从 URL 参数获取商品 ID
      const pages = Taro.getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const productId = (currentPage as any)?.options?.id;

      if (!productId) {
        setError('商品不存在');
        setIsLoading(false);
        return;
      }

      // 获取商品详情
      const res = await apiGet<ProductDetailResponse>(`/products/${productId}`, {
        tenantId: TENANT_ID,
      });

      if (res.data) {
        setProduct(res.data.product);
        setInventory(res.data.dailyInventory || null);
      } else {
        setError('商品不存在');
      }
    } catch (err) {
      console.error('获取商品详情失败:', err);
      setError('加载失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 获取库存数量
   */
  const getAvailableQuantity = (): number | undefined => {
    if (!inventory) return undefined;
    return inventory.stockQuantity - inventory.soldQuantity;
  };

  /**
   * 处理加入购物车
   */
  const handleAddToCart = () => {
    if (!product) return;

    // 检查库存
    const available = getAvailableQuantity();
    if (available !== undefined && available <= 0) {
      Taro.showToast({ title: '该商品已售罄', icon: 'none' });
      return;
    }

    if (isFixedPricing(product.pricingConfig)) {
      // 固定价格直接添加
      addItem({
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0]?.url,
        pricingType: product.pricingType,
        quantity,
        unitPrice: product.pricingConfig.price,
        pricingSnapshot: product.pricingConfig,
      });
      Taro.showToast({ title: '已加入购物车', icon: 'success' });
    } else {
      // 其他类型显示规格选择器
      setShowSpecSelector(true);
    }
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
    pricingSnapshot: PricingConfig;
  }) => {
    addItem(item as Parameters<typeof addItem>[0]);
    Taro.showToast({ title: '已加入购物车', icon: 'success' });
    setShowSpecSelector(false);
  };

  /**
   * 立即购买
   */
  const handleBuyNow = () => {
    if (!product) return;

    // 检查库存
    const available = getAvailableQuantity();
    if (available !== undefined && available <= 0) {
      Taro.showToast({ title: '该商品已售罄', icon: 'none' });
      return;
    }

    if (isFixedPricing(product.pricingConfig)) {
      addItem({
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0]?.url,
        pricingType: product.pricingType,
        quantity,
        unitPrice: product.pricingConfig.price,
        pricingSnapshot: product.pricingConfig,
      });
      Taro.switchTab({ url: '/pages/cart/index' });
    } else {
      setShowSpecSelector(true);
    }
  };

  const goBack = () => {
    Taro.navigateBack();
  };

  // 加载状态
  if (isLoading) {
    return (
      <view className="product-detail-page">
        <Loading text="加载中..." />
      </view>
    );
  }

  // 错误状态
  if (error || !product) {
    return (
      <view className="product-detail-page">
        <view className="error-state">
          <Empty text={error || '商品不存在'} />
          <Button type="primary" onClick={goBack}>返回</Button>
        </view>
      </view>
    );
  }

  const available = getAvailableQuantity();
  const isSoldOut = available !== undefined && available <= 0;
  const isLowStock = available !== undefined && available > 0 && available <= 5;

  /**
   * 获取价格显示
   */
  const getPriceDisplay = () => {
    const config = product.pricingConfig;
    if (isFixedPricing(config)) {
      return <Price value={config.price} size="large" />;
    }
    if (isWeightPricing(config)) {
      return (
        <view className="price-row">
          <text className="price-value">¥{config.pricePerJin}</text>
          <text className="price-unit">/斤</text>
        </view>
      );
    }
    if (isCustomPricing(config)) {
      return <text className="price-value price-value--custom">¥--</text>;
    }
    return null;
  };

  /**
   * 获取库存描述
   */
  const getStockDescription = () => {
    if (isSoldOut) return '已售罄';
    if (isLowStock) return `仅剩 ${available} 份`;
    return '有货';
  };

  /**
   * 获取底部按钮状态
   */
  const getButtonState = () => {
    if (isSoldOut) {
      return { disabled: true, text: '已售罄' };
    }
    return { disabled: false, text: '加入购物车' };
  };

  return (
    <view className="product-detail-page">
      {/* 返回按钮 */}
      <view className="back-btn" onClick={goBack}>
        <text>←</text>
      </view>

      {/* 图片轮播 */}
      <swiper
        className="image-swiper"
        indicatorDots
        indicatorActiveColor="#FF6B00"
        indicatorColor="rgba(255,255,255,0.5)"
        autoplay={false}
        circular
        onChange={(e: any) => setCurrentImageIndex(e.detail.current)}
      >
        {product.images.map((image, index) => (
          <swiper-item key={index}>
            <image className="swiper-image" src={image.url} mode="aspectFill" />
          </swiper-item>
        ))}
      </swiper>

      {/* 图片指示器 */}
      <view className="image-indicator">
        <text>{currentImageIndex + 1}/{product.images.length}</text>
      </view>

      {/* 商品信息 */}
      <view className="product-info">
        {/* 价格区域 */}
        <view className="price-section">
          {getPriceDisplay()}
          <view className="stock-info">
            <StockBadge 
              inventory={inventory || undefined} 
              alertThreshold={5}
              tags={product.tags}
            />
            <text className="stock-text">{getStockDescription()}</text>
          </view>
        </view>

        {/* 商品名称 */}
        <view className="product-name-section">
          <text className="product-name">{product.name}</text>
          {product.tags && product.tags.length > 0 && (
            <view className="product-tags">
              {product.tags.map((tag) => (
                <Tag key={tag} type="warning" size="small">{tag}</Tag>
              ))}
            </view>
          )}
        </view>

        {/* 商品描述 */}
        {product.description && (
          <view className="product-desc">
            <text>{product.description}</text>
          </view>
        )}

        {/* 计价方式说明 */}
        <view className="pricing-info">
          {isFixedPricing(product.pricingConfig) && (
            <view className="pricing-item">
              <text className="pricing-label">计价方式：</text>
              <text className="pricing-value">固定份量 ({product.pricingConfig.unit})</text>
            </view>
          )}
          {isWeightPricing(product.pricingConfig) && (
            <view className="pricing-item">
              <text className="pricing-label">计价方式：</text>
              <text className="pricing-value">
                按斤称重 · ¥{product.pricingConfig.pricePerJin}/斤 · 
                最少 {product.pricingConfig.minWeight} 斤
              </text>
            </view>
          )}
          {isCustomPricing(product.pricingConfig) && (
            <view className="pricing-item">
              <text className="pricing-label">计价方式：</text>
              <text className="pricing-value">自定义规格组合</text>
            </view>
          )}
        </view>

        {/* 销量信息 */}
        {product.salesCount !== undefined && (
          <view className="sales-info">
            <text>已售 {product.salesCount} 份</text>
          </view>
        )}
      </view>

      {/* 底部操作栏 */}
      <view className="action-bar">
        {/* 固定价格的数量选择 */}
        {isFixedPricing(product.pricingConfig) && !isSoldOut && (
          <view className="quantity-selector">
            <view 
              className="quantity-btn"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <text>-</text>
            </view>
            <view className="quantity-value">
              <text>{quantity}</text>
            </view>
            <view 
              className="quantity-btn"
              onClick={() => setQuantity(quantity + 1)}
            >
              <text>+</text>
            </view>
          </view>
        )}

        <view className="action-buttons">
          <Button
            type="default"
            size="large"
            disabled={isSoldOut}
            onClick={handleBuyNow}
          >
            {isSoldOut ? '已售罄' : '立即购买'}
          </Button>
          <Button
            type="primary"
            size="large"
            disabled={isSoldOut}
            onClick={handleAddToCart}
          >
            {getButtonState().text}
          </Button>
        </view>
      </view>

      {/* 规格选择器弹窗 */}
      <SpecSelector
        product={product}
        visible={showSpecSelector}
        onClose={() => setShowSpecSelector(false)}
        onAdd={handleSpecAdd}
      />
    </view>
  );
};

export default ProductDetail;

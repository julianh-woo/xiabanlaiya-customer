import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Product, isFixedPricing } from '@/shared/types/product';
import { useCart } from '@/context/CartContext';
import { Button, Loading, Empty } from '@/components/ui';
import { post as apiPost, get as apiGet } from '@/shared/network/request';
import './index.scss';

// API 基础配置
const API_BASE = 'http://175.27.158.118:5000/api';
const TENANT_ID = 'default';

interface QuickRebuyProps {
  visible: boolean;
  onClose: () => void;
  orderId?: string; // 用于复购特定订单
}

interface RebuyProduct {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  specs?: Record<string, string>;
  pricingType: 'fixed' | 'weight' | 'custom';
  pricingSnapshot?: Product['pricingConfig'];
}

interface FrequentItem {
  productId: string;
  productName: string;
  productImage?: string;
  purchaseCount: number;
  lastPrice: number;
  pricingType: 'fixed' | 'weight' | 'custom';
  pricingSnapshot?: Product['pricingConfig'];
}

const QuickRebuy: React.FC<QuickRebuyProps> = ({
  visible,
  onClose,
  orderId,
}) => {
  const [products, setProducts] = useState<RebuyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    if (visible) {
      fetchRebuyProducts();
    }
  }, [visible, orderId]);

  /**
   * 获取复购商品
   * 优先从订单复购 API 获取，否则从常购商品获取
   */
  const fetchRebuyProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 尝试从订单复购 API 获取
      if (orderId) {
        try {
          const res = await apiPost<{ items: RebuyProduct[] }>(
            `/orders/${orderId}/rebuy`,
            {},
            { tenantId: TENANT_ID }
          );
          if (res.data?.items && res.data.items.length > 0) {
            setProducts(res.data.items);
            return;
          }
        } catch (err) {
          console.log('订单复购 API 不可用，尝试常购商品');
        }
      }

      // 尝试从常购商品 API 获取
      try {
        const res = await apiGet<FrequentItem[]>(`/customer/frequent-items`, {
          tenantId: TENANT_ID,
        });
        if (res.data && Array.isArray(res.data)) {
          const rebuyProducts: RebuyProduct[] = res.data.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            quantity: 1,
            unitPrice: item.lastPrice,
            pricingType: item.pricingType,
            pricingSnapshot: item.pricingSnapshot,
          }));
          setProducts(rebuyProducts);
          return;
        }
      } catch (err) {
        console.log('常购商品 API 不可用，使用默认数据');
      }

      // 使用默认常购商品
      setProducts(getDefaultProducts());
    } catch (err) {
      console.error('获取复购商品失败:', err);
      setError('加载失败');
      setProducts(getDefaultProducts());
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 获取默认常购商品
   */
  const getDefaultProducts = (): RebuyProduct[] => {
    return [
      {
        productId: 'p001',
        productName: '招牌卤味拼盘',
        productImage: 'https://picsum.photos/200/200?random=1',
        quantity: 1,
        unitPrice: 68,
        pricingType: 'fixed',
        pricingSnapshot: { type: 'fixed', price: 68, unit: '份' },
      },
      {
        productId: 'p002',
        productName: '麻辣鸭脖',
        productImage: 'https://picsum.photos/200/200?random=2',
        quantity: 1,
        unitPrice: 28,
        pricingType: 'fixed',
        pricingSnapshot: { type: 'fixed', price: 28, unit: '份' },
      },
      {
        productId: 'p003',
        productName: '秘制鸭翅',
        productImage: 'https://picsum.photos/200/200?random=3',
        quantity: 1,
        unitPrice: 18,
        pricingType: 'fixed',
        pricingSnapshot: { type: 'fixed', price: 18, unit: '份' },
      },
      {
        productId: 'p004',
        productName: '鲜卤牛肉',
        productImage: 'https://picsum.photos/200/200?random=4',
        quantity: 1,
        unitPrice: 48,
        pricingType: 'weight',
        pricingSnapshot: { type: 'weight', pricePerJin: 48, minWeight: 0.5, stepWeight: 0.5 },
      },
    ];
  };

  /**
   * 添加单个商品到购物车
   */
  const handleAddOne = (product: RebuyProduct) => {
    addItem({
      productId: product.productId,
      productName: product.productName,
      productImage: product.productImage,
      pricingType: product.pricingType,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      specs: product.specs,
      pricingSnapshot: product.pricingSnapshot || { type: 'fixed', price: product.unitPrice, unit: '份' },
    });
    Taro.showToast({ title: '已加入购物车', icon: 'success' });
  };

  /**
   * 添加全部商品到购物车
   */
  const handleAddAll = () => {
    products.forEach(product => {
      addItem({
        productId: product.productId,
        productName: product.productName,
        productImage: product.productImage,
        pricingType: product.pricingType,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        specs: product.specs,
        pricingSnapshot: product.pricingSnapshot || { type: 'fixed', price: product.unitPrice, unit: '份' },
      });
    });
    Taro.showToast({ title: '已全部加入购物车', icon: 'success' });
    onClose();
  };

  /**
   * 计算总价
   */
  const getTotalPrice = () => {
    return products.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0);
  };

  if (!visible) return null;

  return (
    <>
      <view className="quick-rebuy-mask" onClick={onClose} />
      <view className="quick-rebuy">
        {/* 头部 */}
        <view className="quick-rebuy__header">
          <view className="quick-rebuy__title-wrap">
            <text className="quick-rebuy__title">一键复购</text>
            {orderId && <text className="quick-rebuy__subtitle">上次购买</text>}
          </view>
          <view className="quick-rebuy__close" onClick={onClose}>
            <text>✕</text>
          </view>
        </view>

        {/* 内容区域 */}
        <view className="quick-rebuy__content">
          {isLoading ? (
            <view className="quick-rebuy__loading">
              <Loading text="加载中..." />
            </view>
          ) : error ? (
            <view className="quick-rebuy__error">
              <text>{error}</text>
              <Button size="small" onClick={fetchRebuyProducts}>重试</Button>
            </view>
          ) : products.length === 0 ? (
            <view className="quick-rebuy__empty">
              <Empty text="暂无复购记录" />
            </view>
          ) : (
            <scroll-view className="rebuy-list" scroll-y>
              {products.map((product, index) => (
                <view key={`${product.productId}-${index}`} className="rebuy-item">
                  <image
                    className="rebuy-item__image"
                    src={product.productImage || '/assets/images/placeholder.png'}
                    mode="aspectFill"
                  />
                  <view className="rebuy-item__info">
                    <text className="rebuy-item__name">{product.productName}</text>
                    <view className="rebuy-item__price-row">
                      <text className="rebuy-item__price">
                        ¥{product.unitPrice}
                      </text>
                      {product.pricingType === 'weight' && (
                        <>
                          <text className="rebuy-item__unit">/斤</text>
                          <text className="rebuy-item__weight"> · {product.quantity}斤</text>
                        </>
                      )}
                    </view>
                  </view>
                  <view 
                    className="rebuy-item__add"
                    onClick={() => handleAddOne(product)}
                  >
                    <text>+</text>
                  </view>
                </view>
              ))}
            </scroll-view>
          )}
        </view>

        {/* 底部操作栏 */}
        {products.length > 0 && (
          <view className="quick-rebuy__footer">
            <view className="footer-info">
              <text className="footer-label">合计</text>
              <text className="footer-price">¥{getTotalPrice().toFixed(2)}</text>
            </view>
            <Button type="primary" size="large" onClick={handleAddAll}>
              全部加入购物车
            </Button>
          </view>
        )}
      </view>
    </>
  );
};

export default QuickRebuy;

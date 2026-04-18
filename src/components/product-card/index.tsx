import React from 'react';
import Taro from '@tarojs/taro';
import { Product, isFixedPricing, isWeightPricing } from '@/shared/types/product';
import { Price } from '@/components/ui';
import './index.scss';

interface ProductCardProps {
  product: Product;
  stock?: number;
  tags?: string[]; // 自定义标签，如 ['刚出锅', '新品', '热销']
  onClick?: () => void;
  onAddCart?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  stock,
  tags = [],
  onClick,
  onAddCart,
}) => {
  const isOutOfStock = stock !== undefined && stock <= 0;
  const isLowStock = stock !== undefined && stock > 0 && stock <= 5;

  // 合并商品标签和自定义标签
  const allTags = [...new Set([...(product.tags || []), ...tags])];

  const getStockLabel = () => {
    if (isOutOfStock) return '售罄';
    if (isLowStock) return '紧张';
    return null;
  };

  const getStockClass = () => {
    if (isOutOfStock) return 'stock-tag--soldout';
    if (isLowStock) return 'stock-tag--low';
    return '';
  };

  const getPriceText = () => {
    const config = product.pricingConfig;
    if (isFixedPricing(config)) {
      return null; // Price component will handle display
    }
    if (isWeightPricing(config)) {
      return `¥${config.pricePerJin}/斤`;
    }
    return '¥--';
  };

  const handleAddCart = (e: Taro.TouchEvent) => {
    e.stopPropagation();
    if (!isOutOfStock && onAddCart) {
      onAddCart();
    }
  };

  return (
    <view
      className={`product-card ${isOutOfStock ? 'product-card--disabled' : ''}`}
      onClick={onClick}
    >
      <view className="product-card__image-wrap">
        <image
          className="product-card__image"
          src={product.images?.[0]?.url || '/assets/images/placeholder.png'}
          mode="aspectFill"
          lazyLoad
        />
        
        {/* 库存标签 */}
        {getStockLabel() && (
          <view className={`stock-tag ${getStockClass()}`}>
            <text>{getStockLabel()}</text>
          </view>
        )}
        
        {/* 商品标签 */}
        {allTags.length > 0 && !getStockLabel() && (
          <view className="product-tags">
            {allTags.slice(0, 2).map((tag, index) => (
              <view 
                key={tag} 
                className={`product-tag product-tag--${index}`}
              >
                <text>{tag}</text>
              </view>
            ))}
          </view>
        )}
      </view>

      <view className="product-card__content">
        <text className="product-card__name text-ellipsis-2">{product.name}</text>

        {product.description && (
          <text className="product-card__desc text-ellipsis">{product.description}</text>
        )}

        <view className="product-card__footer">
          <view className="product-card__price">
            {isFixedPricing(product.pricingConfig) ? (
              <Price value={product.pricingConfig.price} size="medium" />
            ) : (
              <text className="product-card__price-text">{getPriceText()}</text>
            )}
          </view>

          {!isOutOfStock && (
            <view
              className="product-card__add-btn"
              onClick={handleAddCart}
            >
              <text>+</text>
            </view>
          )}
        </view>
      </view>
    </view>
  );
};

export default ProductCard;

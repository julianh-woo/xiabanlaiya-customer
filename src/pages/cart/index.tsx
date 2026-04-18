import React, { useState } from 'react';
import Taro from '@tarojs/taro';
import { Button, Price, Empty, Dialog } from '@/components/ui';
import { useCart, CartItem } from '@/context/CartContext';
import './index.scss';

const Cart: React.FC = () => {
  const { items, updateQuantity, updateWeight, removeItem, clear, getTotal } = useCart();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(items.map(i => i.id)));

  const total = getTotal();

  // 更新选中状态
  React.useEffect(() => {
    // 同步选中状态，移除已删除的商品
    setSelectedItems(prev => {
      const newSet = new Set<string>();
      prev.forEach(id => {
        if (items.some(item => item.id === id)) {
          newSet.add(id);
        }
      });
      // 如果全选被取消，且之前全选，现在有新商品则重新全选
      if (prev.size === items.length && newSet.size < items.length) {
        items.forEach(item => newSet.add(item.id));
      }
      return newSet;
    });
  }, [items]);

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.id)));
    }
  };

  /**
   * 切换单个商品选中状态
   */
  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  /**
   * 计算选中商品的总价
   */
  const getSelectedTotal = () => {
    return items
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + item.totalPrice, 0);
  };

  /**
   * 计算选中商品的总数量
   */
  const getSelectedCount = () => {
    return items
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => 
        sum + (item.pricingType === 'weight' ? (item.weight || 0) : item.quantity), 
        0
      );
  };

  /**
   * 数量变化处理
   */
  const handleQuantityChange = (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      handleRemoveItem(id);
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  /**
   * 重量变化处理
   */
  const handleWeightChange = (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newWeight = Number((item.weight || 0) + delta).toFixed(1);
    if (Number(newWeight) <= 0) {
      handleRemoveItem(id);
    } else {
      updateWeight(id, Number(newWeight));
    }
  };

  /**
   * 移除商品
   */
  const handleRemoveItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const confirmed = await Dialog.confirm({
      title: '确认删除',
      message: `确定要从购物车中移除「${item.productName}」吗？`,
      confirmText: '删除',
      confirmColor: '#FF4D4F',
    });

    if (confirmed) {
      removeItem(id);
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  /**
   * 清空购物车
   */
  const handleClearCart = async () => {
    const confirmed = await Dialog.confirm({
      title: '确认清空',
      message: '确定要清空购物车吗？',
      confirmText: '清空',
      confirmColor: '#FF4D4F',
    });

    if (confirmed) {
      clear();
      setSelectedItems(new Set());
    }
  };

  /**
   * 去结算
   */
  const handleCheckout = () => {
    if (selectedItems.size === 0) {
      Taro.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }

    // 将选中的商品ID存储到Storage
    Taro.setStorageSync('checkout_items', Array.from(selectedItems));
    Taro.navigateTo({ url: '/pages/checkout/index' });
  };

  /**
   * 返回首页
   */
  const goHome = () => {
    Taro.switchTab({ url: '/pages/home/index' });
  };

  /**
   * 渲染购物车商品
   */
  const renderCartItem = (item: CartItem) => {
    const isSelected = selectedItems.has(item.id);
    const isWeight = item.pricingType === 'weight';

    return (
      <view
        key={item.id}
        className={`cart-item ${isSelected ? 'cart-item--selected' : ''}`}
      >
        {/* 选择按钮 */}
        <view className="cart-item__select" onClick={() => toggleSelectItem(item.id)}>
          <view className={`select-circle ${isSelected ? 'select-circle--checked' : ''}`}>
            {isSelected && <text>✓</text>}
          </view>
        </view>

        {/* 商品图片 */}
        <image
          className="cart-item__image"
          src={item.productImage || '/assets/images/placeholder.png'}
          mode="aspectFill"
        />

        {/* 商品信息 */}
        <view className="cart-item__info">
          <text className="cart-item__name text-ellipsis">{item.productName}</text>

          {item.specs && Object.keys(item.specs).length > 0 && (
            <view className="cart-item__specs">
              {Object.entries(item.specs).map(([key, value]) => (
                <text key={key} className="spec-tag">{value}</text>
              ))}
            </view>
          )}

          <view className="cart-item__footer">
            <Price value={item.unitPrice} size="small" />
            {isWeight && <text className="weight-unit">/斤</text>}
          </view>
        </view>

        {/* 数量/重量控制 */}
        <view className="cart-item__controls">
          <view className="controls-stepper">
            {isWeight ? (
              <>
                <view
                  className="stepper-btn"
                  onClick={() => handleWeightChange(item.id, -0.5)}
                >
                  <text>-</text>
                </view>
                <view className="stepper-value">
                  <text>{item.weight?.toFixed(1) || '0.0'}</text>
                </view>
                <view
                  className="stepper-btn"
                  onClick={() => handleWeightChange(item.id, 0.5)}
                >
                  <text>+</text>
                </view>
              </>
            ) : (
              <>
                <view
                  className="stepper-btn"
                  onClick={() => handleQuantityChange(item.id, -1)}
                >
                  <text>-</text>
                </view>
                <view className="stepper-value">
                  <text>{item.quantity}</text>
                </view>
                <view
                  className="stepper-btn"
                  onClick={() => handleQuantityChange(item.id, 1)}
                >
                  <text>+</text>
                </view>
              </>
            )}
          </view>
        </view>

        {/* 小计 */}
        <view className="cart-item__subtotal">
          <text className="subtotal-price">¥{item.totalPrice.toFixed(2)}</text>
        </view>

        {/* 删除按钮 */}
        <view 
          className="cart-item__delete"
          onClick={() => handleRemoveItem(item.id)}
        >
          <text>×</text>
        </view>
      </view>
    );
  };

  // 空购物车
  if (items.length === 0) {
    return (
      <view className="cart-page">
        <view className="cart-empty">
          <Empty text="购物车是空的" />
          <Button type="primary" onClick={goHome}>
            去逛逛
          </Button>
        </view>
      </view>
    );
  }

  return (
    <view className="cart-page">
      <scroll-view className="cart-content" scroll-y>
        {/* 全选栏 */}
        <view className="cart-header">
          <view className="cart-header__select" onClick={toggleSelectAll}>
            <view className={`select-circle ${selectedItems.size === items.length ? 'select-circle--checked' : ''}`}>
              {selectedItems.size === items.length && <text>✓</text>}
            </view>
            <text className="select-label">全选</text>
          </view>
          <view 
            className="cart-header__clear"
            onClick={handleClearCart}
          >
            <text>清空</text>
          </view>
        </view>

        {/* 商品列表 */}
        <view className="cart-list">
          {items.map(renderCartItem)}
        </view>
      </scroll-view>

      {/* 底部结算栏 */}
      <view className="cart-footer">
        <view className="cart-footer__info">
          <view className="total-info">
            <text className="total-label">合计</text>
            <text className="total-amount">¥{getSelectedTotal().toFixed(2)}</text>
          </view>
          <text className="item-count">
            已选 {getSelectedCount()} 
            {selectedItems.size > 0 && items.find(i => selectedItems.has(i.id))?.pricingType === 'weight' 
              ? '斤' 
              : '件'}
          </text>
        </view>
        <Button
          type="primary"
          size="large"
          className="checkout-btn"
          onClick={handleCheckout}
          disabled={selectedItems.size === 0}
        >
          去结算
        </Button>
      </view>
    </view>
  );
};

export default Cart;

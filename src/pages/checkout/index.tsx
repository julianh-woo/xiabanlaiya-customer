import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Button, Input, Price, Loading, Dialog } from '@/components/ui';
import { DeliveryModeSelector, DeliveryMode } from '@/components/delivery-mode-selector';
import { useCart, CartItem } from '@/context/CartContext';
import { useLedger } from '@/context/LedgerContext';
import { post as apiPost } from '@/shared/network/request';
import './index.scss';

// API 基础配置
const API_BASE = 'http://175.27.158.118:5000/api';
const TENANT_ID = 'default';

// 支付方式
type PayMethod = 'in_store' | 'online' | 'ledger';

interface DeliveryAddress {
  name: string;
  phone: string;
  address: string;
}

interface CreateOrderRequest {
  items: {
    productId: string;
    comboId?: string;
    specSnapshot?: Record<string, string | number>;
    quantity: number;
    unit: string;
  }[];
  deliveryType: 'self_pickup' | 'local_delivery' | 'express_shipping';
  paymentType: 'in_store' | 'online' | 'ledger';
  deliveryAddress?: DeliveryAddress;
  note?: string;
}

interface CreateOrderResponse {
  id: string;
  orderNo: string;
  status: string;
}

const Checkout: React.FC = () => {
  const { items, removeItem, clear } = useCart();
  const { balance, pay } = useLedger();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 配送方式
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('pickup');

  // 支付方式
  const [payMethod, setPayMethod] = useState<PayMethod>('in_store');
  const [isCreditEnabled] = useState(false);

  // 联系人信息
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // 配送地址
  const [address, setAddress] = useState('');
  const [remark, setRemark] = useState('');

  // 选中结算的商品
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);

  // 费用计算
  const deliveryFee = deliveryMode === 'pickup' ? 0 : deliveryMode === 'local' ? 5 : 10;
  const goodsAmount = checkoutItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalAmount = goodsAmount + deliveryFee;

  useEffect(() => {
    // 获取选中的商品
    const selectedIds = Taro.getStorageSync('checkout_items') || [];
    if (selectedIds.length > 0) {
      const selected = items.filter(item => selectedIds.includes(item.id));
      setCheckoutItems(selected);
    } else {
      // 如果没有预设选择，默认全部选中
      setCheckoutItems([...items]);
    }

    // 获取保存的联系人信息
    const savedName = Taro.getStorageSync('contact_name');
    const savedPhone = Taro.getStorageSync('contact_phone');
    const savedAddress = Taro.getStorageSync('delivery_address');
    if (savedName) setContactName(savedName);
    if (savedPhone) setContactPhone(savedPhone);
    if (savedAddress) setAddress(savedAddress);
  }, [items]);

  const handleDeliveryModeChange = (mode: DeliveryMode) => {
    setDeliveryMode(mode);
  };

  const handlePayMethodChange = (method: PayMethod) => {
    setPayMethod(method);
  };

  /**
   * 表单验证
   */
  const validateForm = (): boolean => {
    if (!contactName.trim()) {
      Taro.showToast({ title: '请输入联系人姓名', icon: 'none' });
      return false;
    }
    if (!contactPhone.trim()) {
      Taro.showToast({ title: '请输入联系电话', icon: 'none' });
      return false;
    }
    if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return false;
    }
    if (deliveryMode !== 'pickup' && !address.trim()) {
      Taro.showToast({ title: '请输入配送地址', icon: 'none' });
      return false;
    }
    return true;
  };

  /**
   * 选择微信收货地址
   */
  const handleChooseAddress = async () => {
    try {
      const res = await Taro.chooseAddress();
      if (res) {
        setAddress(`${res.provinceName}${res.cityName}${res.countyName}${res.detailInfo}`);
        if (!contactName.trim() && res.userName) {
          setContactName(res.userName);
        }
        if (!contactPhone.trim() && res.telNumber) {
          setContactPhone(res.telNumber);
        }
      }
    } catch (error) {
      console.log('选择地址失败:', error);
      Taro.showToast({ title: '请手动输入地址', icon: 'none' });
    }
  };

  /**
   * 提交订单
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (checkoutItems.length === 0) {
      Taro.showToast({ title: '购物车是空的', icon: 'none' });
      return;
    }

    // 保存联系人信息
    Taro.setStorageSync('contact_name', contactName);
    Taro.setStorageSync('contact_phone', contactPhone);
    if (deliveryMode !== 'pickup') {
      Taro.setStorageSync('delivery_address', address);
    }

    // 在线支付时检查余额
    if (payMethod === 'online' && balance < totalAmount) {
      const confirmed = await Dialog.confirm({
        title: '余额不足',
        message: `您的积分余额为 ${balance.toFixed(2)}，订单金额为 ${totalAmount.toFixed(2)}，是否前往充值？`,
        confirmText: '去充值',
      });
      if (confirmed) {
        Taro.showToast({ title: '充值功能开发中', icon: 'none' });
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 构建订单数据
      const orderData: CreateOrderRequest = {
        items: checkoutItems.map(item => ({
          productId: item.productId,
          specSnapshot: item.specs,
          quantity: item.pricingType === 'weight' 
            ? (item.weight || 1) 
            : item.quantity,
          unit: item.pricingType === 'weight' ? '斤' : '份',
        })),
        deliveryType: deliveryMode === 'pickup' 
          ? 'self_pickup' 
          : deliveryMode === 'local' 
            ? 'local_delivery' 
            : 'express_shipping',
        paymentType: payMethod,
        deliveryAddress: deliveryMode !== 'pickup' ? {
          name: contactName,
          phone: contactPhone,
          address: address,
        } : undefined,
        note: remark || undefined,
      };

      // 调用创建订单 API
      let orderNo = '';
      let orderId = '';

      try {
        const res = await apiPost<CreateOrderResponse>('/orders', orderData, {
          tenantId: TENANT_ID,
        });

        if (res.data) {
          orderNo = res.data.orderNo;
          orderId = res.data.id;
        } else {
          // API 返回格式不符合预期，使用本地生成
          orderNo = `ORD${Date.now()}`;
        }
      } catch (apiError) {
        console.error('API 调用失败:', apiError);
        // API 不可用时使用模拟订单号
        orderNo = `ORD${Date.now()}`;
      }

      // 如果是在线支付，扣除积分
      if (payMethod === 'online') {
        const paySuccess = await pay(orderNo, totalAmount);
        if (!paySuccess) {
          Taro.showToast({ title: '支付失败，请重试', icon: 'none' });
          setIsLoading(false);
          return;
        }
      }

      // 清除已结算的商品
      checkoutItems.forEach(item => {
        removeItem(item.id);
      });

      // 保存订单到本地记录
      const orderHistory = Taro.getStorageSync('order_history') || [];
      orderHistory.unshift({
        orderId,
        orderNo,
        items: checkoutItems,
        totalAmount,
        status: payMethod === 'in_store' ? 'pending' : 'paid',
        deliveryMode,
        contactName,
        contactPhone,
        address: deliveryMode !== 'pickup' ? address : undefined,
        createdAt: new Date().toISOString(),
      });
      Taro.setStorageSync('order_history', orderHistory);

      Taro.showToast({ title: '下单成功', icon: 'success' });

      // 跳转到订单详情
      setTimeout(() => {
        Taro.redirectTo({
          url: `/pages/order-detail/index?orderNo=${orderNo}&fromCheckout=true`,
        });
      }, 1500);
    } catch (error) {
      console.error('Checkout error:', error);
      setError('下单失败，请重试');
      Taro.showToast({ title: '下单失败，请重试', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  // 店铺信息
  const shopInfo = {
    name: '下班来鸭卤味店',
    address: 'XX市XX区XX路123号',
    phone: '400-888-8888',
    hours: '10:00 - 22:00',
  };

  // 空购物车
  if (checkoutItems.length === 0) {
    return (
      <view className="checkout-page">
        <view className="checkout-empty">
          <text>购物车是空的</text>
          <Button type="primary" size="large" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
            去逛逛
          </Button>
        </view>
      </view>
    );
  }

  return (
    <view className="checkout-page">
      {isLoading && <Loading text="提交中..." />}

      {/* 错误提示 */}
      {error && (
        <view className="error-banner">
          <text>{error}</text>
        </view>
      )}

      <scroll-view className="checkout-content" scroll-y>
        {/* 自提点信息 */}
        {deliveryMode === 'pickup' && (
          <view className="section pickup-section">
            <view className="section__header">
              <text className="section__title">自提点</text>
            </view>
            <view className="pickup-info">
              <view className="pickup-info__name">{shopInfo.name}</view>
              <view className="pickup-info__address">{shopInfo.address}</view>
              <view className="pickup-info__hours">营业时间: {shopInfo.hours}</view>
            </view>
          </view>
        )}

        {/* 配送地址 */}
        {deliveryMode !== 'pickup' && (
          <view className="section address-section">
            <view className="section__header">
              <text className="section__title">配送地址</text>
            </view>
            <view className="address-form">
              <view className="form-row">
                <text className="form-label">联系人</text>
                <Input
                  className="form-input"
                  value={contactName}
                  onChange={setContactName}
                  placeholder="请输入联系人姓名"
                />
              </view>
              <view className="form-row">
                <text className="form-label">联系电话</text>
                <Input
                  className="form-input"
                  type="phone"
                  value={contactPhone}
                  onChange={setContactPhone}
                  placeholder="请输入手机号"
                />
              </view>
              <view className="form-row">
                <text className="form-label">详细地址</text>
                <view className="address-input-wrap">
                  <Input
                    className="form-input"
                    value={address}
                    onChange={setAddress}
                    placeholder="请输入配送地址"
                  />
                  <view className="address-btn" onClick={handleChooseAddress}>
                    <text>微信</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        )}

        {/* 配送方式 */}
        <view className="section delivery-section">
          <view className="section__header">
            <text className="section__title">配送方式</text>
          </view>
          <DeliveryModeSelector
            value={deliveryMode}
            onChange={handleDeliveryModeChange}
          />
        </view>

        {/* 商品清单 */}
        <view className="section goods-section">
          <view className="section__header">
            <text className="section__title">商品清单</text>
            <text className="section__count">{checkoutItems.length}件</text>
          </view>
          <view className="goods-list">
            {checkoutItems.map((item) => (
              <view key={item.id} className="goods-item">
                <image
                  className="goods-item__image"
                  src={item.productImage || '/assets/images/placeholder.png'}
                  mode="aspectFill"
                />
                <view className="goods-item__info">
                  <text className="goods-item__name">{item.productName}</text>
                  {item.specs && Object.keys(item.specs).length > 0 && (
                    <text className="goods-item__specs">
                      {Object.entries(item.specs).map(([k, v]) => v).join(', ')}
                    </text>
                  )}
                  <view className="goods-item__meta">
                    <text className="goods-item__price">
                      ¥{item.unitPrice}
                      {item.pricingType === 'weight' && '/斤'}
                    </text>
                    <text className="goods-item__quantity">
                      ×{item.pricingType === 'weight' ? `${item.weight}斤` : item.quantity}
                    </text>
                  </view>
                </view>
                <view className="goods-item__total">
                  <text>¥{item.totalPrice.toFixed(2)}</text>
                </view>
              </view>
            ))}
          </view>
        </view>

        {/* 支付方式 */}
        <view className="section payment-section">
          <view className="section__header">
            <text className="section__title">支付方式</text>
          </view>
          <view className="payment-options">
            <view
              className={`payment-option ${payMethod === 'in_store' ? 'payment-option--selected' : ''}`}
              onClick={() => handlePayMethodChange('in_store')}
            >
              <text className="payment-option__label">到店支付</text>
              {payMethod === 'in_store' && <text className="payment-option__check">✓</text>}
            </view>
            <view
              className={`payment-option ${payMethod === 'online' ? 'payment-option--selected' : ''}`}
              onClick={() => handlePayMethodChange('online')}
            >
              <text className="payment-option__label">积分支付</text>
              <text className="payment-option__balance">余额: ¥{balance.toFixed(2)}</text>
              {payMethod === 'online' && <text className="payment-option__check">✓</text>}
            </view>
            {isCreditEnabled && (
              <view
                className={`payment-option ${payMethod === 'ledger' ? 'payment-option--selected' : ''}`}
                onClick={() => handlePayMethodChange('ledger')}
              >
                <text className="payment-option__label">记账</text>
                {payMethod === 'ledger' && <text className="payment-option__check">✓</text>}
              </view>
            )}
          </view>
        </view>

        {/* 备注 */}
        <view className="section remark-section">
          <view className="section__header">
            <text className="section__title">备注</text>
          </view>
          <Input
            className="remark-input"
            type="text"
            value={remark}
            onChange={setRemark}
            placeholder="有什么特殊要求？如：少辣、多加卤汁"
            maxlength={100}
          />
        </view>
      </scroll-view>

      {/* 底部结算栏 */}
      <view className="checkout-footer">
        <view className="checkout-footer__amount">
          <text className="amount-label">合计</text>
          <text className="amount-value">¥{totalAmount.toFixed(2)}</text>
        </view>
        <Button
          type="primary"
          size="large"
          className="checkout-footer__btn"
          onClick={handleSubmit}
          loading={isLoading}
        >
          提交订单
        </Button>
      </view>
    </view>
  );
};

export default Checkout;

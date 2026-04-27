import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Button, Input, Price, Loading, Dialog } from '@/components/ui';
import { DeliveryModeSelector, DeliveryMode } from '@/components/delivery-mode-selector';
import { useCart, CartItem } from '@/context/CartContext';
import { useLedger } from '@/context/LedgerContext';
import { post as apiPost, get as apiGet } from '@/network/request';
import './index.scss';

// API 基础配置
const API_BASE = 'https://cozejifen.haiei.cn/api';
const TENANT_ID = 'default';

// 支付方式
type PayMethod = 'in_store' | 'online' | 'balance';

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
  paymentType: 'in_store' | 'online' | 'balance';
  deliveryAddress?: DeliveryAddress;
  note?: string;
}

interface CreateOrderResponse {
  id: string;
  orderNo: string;
  status: string;
}

interface PayRequest {
  paymentMethod: 'wechat' | 'balance';
}

interface PayResponse {
  paySign: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
}

const Checkout: React.FC = () => {
  const { items, removeItem, clear } = useCart();
  const { balance, refresh: refreshBalance, pay } = useLedger();
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 配送方式
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('pickup');

  // 支付方式
  const [payMethod, setPayMethod] = useState<PayMethod>('in_store');

  // 联系人信息
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // 配送地址
  const [address, setAddress] = useState('');
  const [remark, setRemark] = useState('');

  // 选中结算的商品
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);

  // 店铺信息
  const [shopInfo, setShopInfo] = useState({
    name: '下班来鸭',
    address: '',
    phone: '',
    hours: '',
  });

  // 费用计算
  const deliveryFee = deliveryMode === 'pickup' ? 0 : deliveryMode === 'local' ? 5 : 10;
  const goodsAmount = checkoutItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalAmount = goodsAmount + deliveryFee;

  useEffect(() => {
    refreshBalance();
    
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

    // 获取店铺信息
    fetchShopInfo();
  }, [items]);

  /**
   * 获取店铺信息
   */
  const fetchShopInfo = async () => {
    try {
      const res = await apiGet<any>('/shop/info', {
        tenantId: TENANT_ID,
      });
      if (res.data) {
        setShopInfo({
          name: res.data.name || '下班来鸭',
          address: res.data.address || '',
          phone: res.data.phone || '',
          hours: res.data.businessHours || '',
        });
      }
    } catch (err) {
      console.error('获取店铺信息失败:', err);
    }
  };

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
    if (payMethod === 'balance' && balance < totalAmount) {
      const confirmed = await Dialog.confirm({
        title: '余额不足',
        message: `您的积分余额为 ${balance.toFixed(2)}，订单金额为 ${totalAmount.toFixed(2)}，是否前往充值？`,
        confirmText: '去充值',
      });
      if (confirmed) {
        Taro.navigateTo({ url: '/pages/points-mall/index' });
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
      const res = await apiPost<CreateOrderResponse>('/orders', orderData, {
        tenantId: TENANT_ID,
      });

      let orderId = '';
      let orderNo = '';

      if (res.data) {
        orderId = res.data.id;
        orderNo = res.data.orderNo;
      } else {
        throw new Error('创建订单失败');
      }

      // 执行支付
      if (payMethod === 'online') {
        await handlePay(orderId, orderNo);
      } else if (payMethod === 'balance') {
        await handleBalancePay(orderId);
      } else {
        // 到店支付
        Taro.showToast({ title: '下单成功', icon: 'success' });
      }

      // 清除已结算的商品
      checkoutItems.forEach(item => {
        removeItem(item.id);
      });
      Taro.removeStorageSync('checkout_items');

      // 跳转到订单详情
      setTimeout(() => {
        Taro.redirectTo({
          url: `/pages/order-detail/index?id=${orderId}`,
        });
      }, 1500);
    } catch (err: any) {
      console.error('下单失败:', err);
      setError(err.message || '下单失败，请重试');
      Taro.showToast({ title: err.message || '下单失败，请重试', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 微信支付
   */
  const handlePay = async (orderId: string, orderNo: string) => {
    setIsPaying(true);
    try {
      // 调用后端获取支付参数
      const res = await apiPost<PayResponse>(`/orders/${orderId}/pay`, {
        paymentMethod: 'wechat',
      } as PayRequest, {
        tenantId: TENANT_ID,
      });

      if (res.data) {
        // 调用微信支付
        const payResult = await Taro.requestPayment({
          timeStamp: res.data.timeStamp,
          nonceStr: res.data.nonceStr,
          package: res.data.package,
          signType: res.data.signType,
          paySign: res.data.paySign,
        });

        if (payResult.errMsg === 'requestPayment:ok') {
          Taro.showToast({ title: '支付成功', icon: 'success' });
          refreshBalance();
        } else {
          Taro.showToast({ title: '支付取消', icon: 'none' });
        }
      }
    } catch (err: any) {
      console.error('微信支付失败:', err);
      Taro.showToast({ title: err.message || '支付失败', icon: 'none' });
      throw err;
    } finally {
      setIsPaying(false);
    }
  };

  /**
   * 余额支付
   */
  const handleBalancePay = async (orderId: string) => {
    setIsPaying(true);
    try {
      await apiPost(`/orders/${orderId}/pay`, {
        paymentMethod: 'balance',
      } as PayRequest, {
        tenantId: TENANT_ID,
      });

      Taro.showToast({ title: '支付成功', icon: 'success' });
      refreshBalance();
    } catch (err: any) {
      console.error('余额支付失败:', err);
      Taro.showToast({ title: err.message || '支付失败', icon: 'none' });
      throw err;
    } finally {
      setIsPaying(false);
    }
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
      {(isLoading || isPaying) && <Loading text={isPaying ? '支付中...' : '提交中...'} />}

      {/* 错误提示 */}
      {error && (
        <view className="error-banner">
          <text>{error}</text>
        </view>
      )}

      <scroll-view className="checkout-content" scroll-y>
        {/* 自提点信息 */}
        {deliveryMode === 'pickup' && shopInfo.address && (
          <view className="section pickup-section">
            <view className="section__header">
              <text className="section__title">自提点</text>
            </view>
            <view className="pickup-info">
              <view className="pickup-info__name">{shopInfo.name}</view>
              <view className="pickup-info__address">{shopInfo.address}</view>
              {shopInfo.hours && (
                <view className="pickup-info__hours">营业时间: {shopInfo.hours}</view>
              )}
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
                      x{item.pricingType === 'weight' ? `${item.weight || 1}斤` : item.quantity}
                    </text>
                  </view>
                </view>
                <Price value={item.totalPrice} size="medium" />
              </view>
            ))}
          </view>
        </view>

        {/* 备注 */}
        <view className="section remark-section">
          <view className="section__header">
            <text className="section__title">备注</text>
          </view>
          <Input
            className="remark-input"
            value={remark}
            onChange={setRemark}
            placeholder="口味偏好、特殊要求等（选填）"
            maxlength={100}
          />
        </view>

        {/* 费用明细 */}
        <view className="section fee-section">
          <view className="fee-row">
            <text className="fee-label">商品金额</text>
            <Price value={goodsAmount} />
          </view>
          <view className="fee-row">
            <text className="fee-label">配送费</text>
            <Price value={deliveryFee} />
          </view>
        </view>

        {/* 支付方式 */}
        <view className="section payment-section">
          <view className="section__header">
            <text className="section__title">支付方式</text>
          </view>
          <view className="payment-options">
            <view
              className={`payment-option ${payMethod === 'in_store' ? 'active' : ''}`}
              onClick={() => handlePayMethodChange('in_store')}
            >
              <text className="payment-option__icon">🏪</text>
              <text className="payment-option__text">到店付款</text>
            </view>
            <view
              className={`payment-option ${payMethod === 'online' ? 'active' : ''}`}
              onClick={() => handlePayMethodChange('online')}
            >
              <text className="payment-option__icon">💳</text>
              <text className="payment-option__text">微信支付</text>
            </view>
            <view
              className={`payment-option ${payMethod === 'balance' ? 'active' : ''}`}
              onClick={() => handlePayMethodChange('balance')}
            >
              <text className="payment-option__icon">💰</text>
              <text className="payment-option__text">余额支付</text>
              <text className="payment-option__balance">（{balance.toFixed(2)}）</text>
            </view>
          </view>
        </view>
      </scroll-view>

      {/* 底部固定区域 */}
      <view className="checkout-footer">
        <view className="total-amount">
          <text className="total-label">合计：</text>
          <Price value={totalAmount} size="large" />
        </view>
        <Button
          type="primary"
          size="large"
          className="submit-btn"
          onClick={handleSubmit}
          disabled={isLoading || isPaying}
        >
          提交订单
        </Button>
      </view>
    </view>
  );
};

export default Checkout;

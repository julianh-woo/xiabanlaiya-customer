import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Order, OrderStatus, ORDER_STATUS_TEXT } from '@/shared/types/order';
import { Button, Price, Loading, Tag, Divider, Dialog } from '@/components/ui';
import { useLedger } from '@/context/LedgerContext';
import './index.scss';

// Mock 订单数据
const mockOrders: Record<string, Order> = {
  'ORD202401150001': {
    id: 'o001',
    tenantId: 't001',
    customerId: 'c001',
    orderNo: 'ORD202401150001',
    status: 'pending',
    items: [
      {
        id: 'oi001',
        productId: 'p001',
        productName: '招牌卤味拼盘',
        image: { url: 'https://picsum.photos/200/200?random=30' },
        quantity: 1,
        unitPrice: 68,
        totalPrice: 68,
        pricingSnapshot: { type: 'fixed', price: 68, unit: '份' },
      },
      {
        id: 'oi002',
        productId: 'p002',
        productName: '麻辣鸭脖',
        image: { url: 'https://picsum.photos/200/200?random=31' },
        quantity: 2,
        unitPrice: 28,
        totalPrice: 56,
        pricingSnapshot: { type: 'fixed', price: 28, unit: '份' },
      },
    ],
    totalAmount: 124,
    finalAmount: 124,
    deliveryMode: 'pickup',
    remark: '多放辣',
    pricingSnapshots: [],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  'ORD202401140002': {
    id: 'o002',
    tenantId: 't001',
    customerId: 'c001',
    orderNo: 'ORD202401140002',
    status: 'preparing',
    items: [
      {
        id: 'oi003',
        productId: 'p003',
        productName: '秘制鸭翅',
        image: { url: 'https://picsum.photos/200/200?random=32' },
        quantity: 3,
        unitPrice: 18,
        totalPrice: 54,
        pricingSnapshot: { type: 'fixed', price: 18, unit: '份' },
      },
    ],
    totalAmount: 54,
    finalAmount: 59,
    deliveryMode: 'local',
    deliveryFee: 5,
    deliveryAddress: { name: '张三', phone: '138****8888', detail: 'XX小区1号楼101' },
    pricingSnapshots: [],
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-14T14:35:00Z',
    confirmedAt: '2024-01-14T14:35:00Z',
  },
  'ORD202401130003': {
    id: 'o003',
    tenantId: 't001',
    customerId: 'c001',
    orderNo: 'ORD202401130003',
    status: 'completed',
    items: [
      {
        id: 'oi004',
        productId: 'p004',
        productName: '鲜卤牛肉',
        image: { url: 'https://picsum.photos/200/200?random=33' },
        quantity: 1,
        unitPrice: 48,
        totalPrice: 48,
        pricingSnapshot: { type: 'weight', pricePerJin: 48, minWeight: 0.5, stepWeight: 0.5 },
      },
    ],
    totalAmount: 48,
    finalAmount: 48,
    deliveryMode: 'pickup',
    pricingSnapshots: [],
    createdAt: '2024-01-13T18:00:00Z',
    updatedAt: '2024-01-13T19:30:00Z',
    confirmedAt: '2024-01-13T18:15:00Z',
    readyAt: '2024-01-13T19:00:00Z',
    completedAt: '2024-01-13T19:30:00Z',
  },
};

const OrderDetail: React.FC = () => {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { balance, pay } = useLedger();

  useEffect(() => {
    fetchOrderDetail();
  }, []);

  const fetchOrderDetail = async () => {
    setIsLoading(true);
    try {
      const pages = Taro.getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const orderNo = (currentPage as any)?.options?.orderNo || 'ORD202401150001';

      await new Promise(resolve => setTimeout(resolve, 300));

      const foundOrder = mockOrders[orderNo] || mockOrders['ORD202401150001'];
      setOrder(foundOrder);
    } catch (error) {
      console.error('Failed to fetch order detail:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (status: OrderStatus) => {
    const config: Record<OrderStatus, { label: string; desc: string; color: string }> = {
      pending: { label: '待确认', desc: '商家正在确认订单，请稍候', color: '#FAAD14' },
      confirmed: { label: '已接单', desc: '商家已确认订单，正在准备中', color: '#1890FF' },
      preparing: { label: '制作中', desc: '您的美食正在制作中', color: '#1890FF' },
      ready: { label: '待取餐/已发货', desc: '您的订单已准备好，请及时取餐', color: '#52C41A' },
      completed: { label: '已完成', desc: '感谢您的购买，欢迎下次光临', color: '#52C41A' },
      cancelled: { label: '已取消', desc: '订单已取消', color: '#999999' },
    };
    return config[status];
  };

  const getProgressSteps = (status: OrderStatus) => {
    const allSteps = [
      { label: '下单', key: 'created' },
      { label: '确认', key: 'confirmed' },
      { label: '制作', key: 'preparing' },
      { label: '完成', key: 'completed' },
    ];

    const statusIndex: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 1,
      preparing: 2,
      ready: 3,
      completed: 3,
      cancelled: -1,
    };

    return allSteps.map((step, index) => ({
      ...step,
      isActive: index <= statusIndex[status],
      isCurrent: index === statusIndex[status],
    }));
  };

  const handleCancel = async () => {
    const confirmed = await Dialog.confirm({
      title: '确认取消',
      message: '确定要取消此订单吗？',
      confirmText: '确定取消',
      confirmColor: '#FF4D4F',
    });

    if (confirmed) {
      // 模拟取消操作
      Taro.showToast({ title: '订单已取消', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    }
  };

  const handlePay = async () => {
    if (!order) return;

    setIsProcessing(true);
    try {
      // 模拟支付
      await new Promise(resolve => setTimeout(resolve, 1500));

      const success = await pay(order.id, order.finalAmount);

      if (success) {
        Taro.showToast({ title: '支付成功', icon: 'success' });
        setOrder(prev => prev ? { ...prev, status: 'confirmed' } : null);
      } else {
        Taro.showToast({ title: '支付失败', icon: 'none' });
      }
    } catch (error) {
      Taro.showToast({ title: '支付失败', icon: 'none' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContact = () => {
    Taro.makePhoneCall({
      phoneNumber: '138****8888',
      fail: () => {
        Taro.showToast({ title: '拨打失败', icon: 'none' });
      },
    });
  };

  const goBack = () => {
    Taro.navigateBack();
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  if (isLoading || !order) {
    return (
      <view className="order-detail-page">
        <Loading text="加载中..." />
      </view>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const progressSteps = getProgressSteps(order.status);

  return (
    <view className="order-detail-page">
      {/* 状态 Banner */}
      <view className="status-banner" style={{ backgroundColor: statusInfo.color }}>
        <text className="status-banner__label">{statusInfo.label}</text>
        <text className="status-banner__desc">{statusInfo.desc}</text>
      </view>

      {/* 进度条 */}
      {order.status !== 'cancelled' && (
        <view className="progress-section">
          <view className="progress-steps">
            {progressSteps.map((step, index) => (
              <view key={step.key} className="progress-step">
                <view className={`step-dot ${step.isActive ? 'step-dot--active' : ''} ${step.isCurrent ? 'step-dot--current' : ''}`}>
                  {step.isActive && <text>✓</text>}
                </view>
                {index < progressSteps.length - 1 && (
                  <view className={`step-line ${step.isActive ? 'step-line--active' : ''}`} />
                )}
                <text className="step-label">{step.label}</text>
              </view>
            ))}
          </view>
        </view>
      )}

      {/* 配送信息 */}
      <view className="info-section">
        <view className="info-header">
          <text className="info-title">配送信息</text>
        </view>
        <view className="info-content">
          {order.deliveryMode === 'pickup' ? (
            <view className="info-row">
              <text className="info-label">取餐方式</text>
              <text className="info-value">到店自取</text>
            </view>
          ) : (
            <>
              <view className="info-row">
                <text className="info-label">配送方式</text>
                <text className="info-value">
                  {order.deliveryMode === 'local' ? '本地配送' : '快递'}
                </text>
              </view>
              {order.deliveryAddress && (
                <view className="info-row">
                  <text className="info-label">收货地址</text>
                  <text className="info-value">
                    {order.deliveryAddress.name} {order.deliveryAddress.phone}
                    {order.deliveryAddress.detail}
                  </text>
                </view>
              )}
            </>
          )}
          <view className="info-row">
            <text className="info-label">下单时间</text>
            <text className="info-value">{formatDateTime(order.createdAt)}</text>
          </view>
          {order.remark && (
            <view className="info-row">
              <text className="info-label">备注</text>
              <text className="info-value info-value--remark">{order.remark}</text>
            </view>
          )}
        </view>
      </view>

      {/* 商品清单 */}
      <view className="info-section">
        <view className="info-header">
          <text className="info-title">商品清单</text>
        </view>
        <view className="info-content">
          {order.items.map(item => (
            <view key={item.id} className="goods-item">
              <image
                className="goods-item__image"
                src={item.image?.url || '/assets/images/placeholder.png'}
                mode="aspectFill"
              />
              <view className="goods-item__info">
                <text className="goods-item__name">{item.productName}</text>
                <text className="goods-item__specs">x{item.quantity}</text>
              </view>
              <Price value={item.totalPrice} size="medium" />
            </view>
          ))}
        </view>
      </view>

      {/* 价格明细 */}
      <view className="info-section">
        <view className="info-header">
          <text className="info-title">价格明细</text>
        </view>
        <view className="info-content">
          <view className="price-row">
            <text className="price-label">商品金额</text>
            <Price value={order.totalAmount} size="medium" />
          </view>
          {order.deliveryFee && order.deliveryFee > 0 && (
            <view className="price-row">
              <text className="price-label">配送费</text>
              <Price value={order.deliveryFee} size="medium" />
            </view>
          )}
          {order.discountAmount && order.discountAmount > 0 && (
            <view className="price-row">
              <text className="price-label">优惠</text>
              <Price value={-order.discountAmount} size="medium" />
            </view>
          )}
          <Divider />
          <view className="price-row price-row--total">
            <text className="price-label">实付金额</text>
            <Price value={order.finalAmount} size="large" />
          </view>
        </view>
      </view>

      {/* 底部操作栏 */}
      <view className="action-bar">
        {order.status === 'pending' && (
          <>
            <Button type="default" size="large" onClick={handleCancel}>
              取消订单
            </Button>
            <Button
              type="primary"
              size="large"
              loading={isProcessing}
              disabled={balance < order.finalAmount}
              onClick={handlePay}
            >
              立即支付
            </Button>
          </>
        )}
        {['confirmed', 'preparing', 'ready'].includes(order.status) && (
          <Button type="primary" size="large" onClick={handleContact}>
            联系商家
          </Button>
        )}
        {order.status === 'completed' && (
          <Button type="primary" size="large" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
            再次购买
          </Button>
        )}
      </view>
    </view>
  );
};

export default OrderDetail;

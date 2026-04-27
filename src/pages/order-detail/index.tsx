import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Order, OrderStatus } from '@/shared/types/order';
import { Button, Price, Loading, Tag, Divider, Dialog } from '@/components/ui';
import { useLedger } from '@/context/LedgerContext';
import { get as apiGet, post as apiPost } from '@/network/request';
import './index.scss';

// API 基础配置
const API_BASE = 'https://cozejifen.haiei.cn/api';
const TENANT_ID = 'default';

interface OrderDetailResponse {
  order: Order;
}

interface PayRequest {
  orderId: string;
  paymentMethod: 'wechat' | 'balance';
}

interface PayResponse {
  paySign: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
}

const OrderDetail: React.FC = () => {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { balance, refresh: refreshBalance, pay } = useLedger();

  useEffect(() => {
    fetchOrderDetail();
    refreshBalance();
  }, []);

  /**
   * 获取订单详情
   */
  const fetchOrderDetail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pages = Taro.getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const orderId = (currentPage as any)?.options?.id;
      const orderNo = (currentPage as any)?.options?.orderNo;

      if (!orderId && !orderNo) {
        setError('订单不存在');
        setIsLoading(false);
        return;
      }

      // 优先使用ID查询
      const url = orderId ? `/orders/${orderId}` : `/orders/by-no/${orderNo}`;
      const res = await apiGet<OrderDetailResponse>(url, {
        tenantId: TENANT_ID,
      });

      if (res.data?.order) {
        setOrder(res.data.order);
      } else {
        setError('订单不存在');
      }
    } catch (err) {
      console.error('获取订单详情失败:', err);
      setError('加载失败，请重试');
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

  /**
   * 取消订单
   */
  const handleCancel = async () => {
    if (!order) return;

    const confirmed = await Dialog.confirm({
      title: '确认取消',
      message: '确定要取消此订单吗？',
      confirmText: '确定取消',
      confirmColor: '#FF4D4F',
    });

    if (confirmed) {
      setIsProcessing(true);
      try {
        await apiPost(`/orders/${order.id}/cancel`, {}, {
          tenantId: TENANT_ID,
        });
        Taro.showToast({ title: '订单已取消', icon: 'success' });
        setOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
      } catch (err) {
        console.error('取消订单失败:', err);
        Taro.showToast({ title: '取消失败，请重试', icon: 'none' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  /**
   * 微信支付
   */
  const handleWechatPay = async () => {
    if (!order) return;

    setIsProcessing(true);
    try {
      // 调用后端获取支付参数
      const res = await apiPost<PayResponse>(`/orders/${order.id}/pay`, {
        paymentMethod: 'wechat',
      }, {
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
          setOrder(prev => prev ? { ...prev, status: 'confirmed' } : null);
        } else {
          Taro.showToast({ title: '支付取消', icon: 'none' });
        }
      }
    } catch (err: any) {
      console.error('支付失败:', err);
      Taro.showToast({ title: err.message || '支付失败', icon: 'none' });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 余额支付
   */
  const handleBalancePay = async () => {
    if (!order) return;

    if (balance < order.finalAmount) {
      Taro.showToast({ title: '余额不足', icon: 'none' });
      return;
    }

    setIsProcessing(true);
    try {
      await apiPost(`/orders/${order.id}/pay`, {
        paymentMethod: 'balance',
      }, {
        tenantId: TENANT_ID,
      });

      Taro.showToast({ title: '支付成功', icon: 'success' });
      setOrder(prev => prev ? { ...prev, status: 'confirmed' } : null);
      refreshBalance();
    } catch (err) {
      console.error('余额支付失败:', err);
      Taro.showToast({ title: '支付失败，请重试', icon: 'none' });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 一键呼叫
   */
  const handleCall = () => {
    Taro.showToast({ title: '功能开发中', icon: 'none' });
  };

  const goBack = () => {
    Taro.navigateBack();
  };

  const getDeliveryText = (mode: Order['deliveryMode']) => {
    const map = { pickup: '到店自取', local: '本地配送', express: '快递配送' };
    return map[mode];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 加载状态
  if (isLoading) {
    return (
      <view className="order-detail-page">
        <Loading text="加载中..." />
      </view>
    );
  }

  // 错误状态
  if (error || !order) {
    return (
      <view className="order-detail-page">
        <view className="error-state">
          <Loading text={error || '订单不存在'} />
          <Button type="primary" onClick={goBack}>返回</Button>
        </view>
      </view>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const progressSteps = getProgressSteps(order.status);
  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const canPay = order.status === 'pending';

  return (
    <view className="order-detail-page">
      {/* 订单状态 */}
      <view className="status-section" style={{ backgroundColor: statusInfo.color }}>
        <text className="status-label">{statusInfo.label}</text>
        <text className="status-desc">{statusInfo.desc}</text>
      </view>

      {/* 进度条 */}
      {order.status !== 'cancelled' && (
        <view className="progress-section">
          <view className="progress-steps">
            {progressSteps.map((step, index) => (
              <view key={step.key} className={`progress-step ${step.isActive ? 'active' : ''} ${step.isCurrent ? 'current' : ''}`}>
                <view className="step-dot">
                  {step.isActive && <text>✓</text>}
                </view>
                <text className="step-label">{step.label}</text>
                {index < progressSteps.length - 1 && <view className={`step-line ${step.isActive ? 'active' : ''}`} />}
              </view>
            ))}
          </view>
        </view>
      )}

      {/* 配送信息 */}
      <view className="delivery-section">
        <view className="delivery-header">
          <text className="delivery-icon">🚚</text>
          <text className="delivery-type">{getDeliveryText(order.deliveryMode)}</text>
        </view>
        {order.deliveryAddress && (
          <view className="delivery-info">
            <text className="receiver">{order.deliveryAddress.name} {order.deliveryAddress.phone}</text>
            <text className="address">
              {order.deliveryAddress.province}{order.deliveryAddress.city}{order.deliveryAddress.district}{order.deliveryAddress.detail}
            </text>
          </view>
        )}
        {order.pickupTime && (
          <view className="pickup-time">
            <text>预约取餐时间：{formatDate(order.pickupTime)}</text>
          </view>
        )}
      </view>

      {/* 商品列表 */}
      <view className="items-section">
        <view className="section-title">商品明细</view>
        {order.items.map(item => (
          <view key={item.id} className="order-item">
            <image
              className="item-image"
              src={item.image?.url || '/assets/images/placeholder.png'}
              mode="aspectFill"
            />
            <view className="item-info">
              <text className="item-name">{item.productName}</text>
              {item.specs && Object.keys(item.specs).length > 0 && (
                <text className="item-specs">
                  {Object.entries(item.specs).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </text>
              )}
              <view className="item-price-row">
                <Price value={item.unitPrice} size="small" />
                <text className="item-quantity">x{item.quantity}</text>
              </view>
            </view>
            <Price value={item.totalPrice} size="medium" />
          </view>
        ))}
      </view>

      {/* 价格明细 */}
      <view className="price-section">
        <view className="price-row">
          <text className="price-label">商品金额</text>
          <Price value={order.totalAmount} />
        </view>
        {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
          <view className="price-row">
            <text className="price-label">配送费</text>
            <Price value={order.deliveryFee} />
          </view>
        )}
        {order.discountAmount !== undefined && order.discountAmount > 0 && (
          <view className="price-row">
            <text className="price-label">优惠</text>
            <Price value={-order.discountAmount} color="#FF4D4F" />
          </view>
        )}
        <Divider />
        <view className="price-row total">
          <text className="price-label">实付金额</text>
          <Price value={order.finalAmount} size="large" />
        </view>
      </view>

      {/* 订单信息 */}
      <view className="info-section">
        <view className="info-row">
          <text className="info-label">订单编号</text>
          <text className="info-value">{order.orderNo}</text>
        </view>
        <view className="info-row">
          <text className="info-label">下单时间</text>
          <text className="info-value">{formatDate(order.createdAt)}</text>
        </view>
        {order.remark && (
          <view className="info-row">
            <text className="info-label">备注</text>
            <text className="info-value">{order.remark}</text>
          </view>
        )}
      </view>

      {/* 操作按钮 */}
      <view className="action-section">
        {canPay && (
          <view className="pay-buttons">
            <Button
              type="default"
              size="large"
              loading={isProcessing}
              onClick={handleBalancePay}
              disabled={balance < order.finalAmount}
            >
              余额支付（{balance.toFixed(2)}）
            </Button>
            <Button
              type="primary"
              size="large"
              loading={isProcessing}
              onClick={handleWechatPay}
            >
              微信支付
            </Button>
          </view>
        )}
        {canCancel && (
          <Button
            type="default"
            size="large"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            取消订单
          </Button>
        )}
        <Button type="default" size="large" onClick={handleCall}>
          联系商家
        </Button>
      </view>
    </view>
  );
};

export default OrderDetail;

import React, { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { Order, OrderStatus } from '@/shared/types/order';
import { Button, Price, Empty, Loading, Tag } from '@/components/ui';
import { get as apiGet } from '@/network/request';
import './index.scss';

// API 基础配置
const API_BASE = 'https://cozejifen.haiei.cn/api';
const TENANT_ID = 'default';

type TabType = 'all' | 'pending' | 'processing' | 'completed';

interface OrderListResponse {
  list: Order[];
  total: number;
  page: number;
  pageSize: number;
}

const tabs: { key: TabType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'processing', label: '进行中' },
  { key: 'completed', label: '已完成' },
];

const Orders: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  /**
   * 获取订单列表
   */
  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 构建查询参数
      const params: Record<string, string> = {
        page: '1',
        pageSize: '20',
      };

      // 根据tab筛选
      if (activeTab === 'pending') {
        params.status = 'pending';
      } else if (activeTab === 'processing') {
        params.status = 'confirmed,preparing,ready';
      } else if (activeTab === 'completed') {
        params.status = 'completed,cancelled';
      }

      const res = await apiGet<OrderListResponse>('/orders', {
        params,
        tenantId: TENANT_ID,
      });

      if (res.data?.list) {
        setOrders(res.data.list);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('获取订单列表失败:', err);
      setError('加载失败');
      Taro.showToast({ title: '加载失败，请下拉刷新', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 下拉刷新
   */
  const handleRefresh = async () => {
    await fetchOrders();
    Taro.stopPullDownRefresh();
  };

  const getFilteredOrders = useCallback(() => {
    if (activeTab === 'all') return orders;
    if (activeTab === 'pending') return orders.filter(o => o.status === 'pending');
    if (activeTab === 'processing') return orders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status));
    if (activeTab === 'completed') return orders.filter(o => ['completed', 'cancelled'].includes(o.status));
    return orders;
  }, [activeTab, orders]);

  const handleOrderClick = (order: Order) => {
    Taro.navigateTo({
      url: `/pages/order-detail/index?orderNo=${order.orderNo}&id=${order.id}`,
    });
  };

  const getStatusTag = (status: OrderStatus) => {
    const config: Record<OrderStatus, { type: 'primary' | 'success' | 'warning' | 'danger' | 'default'; text: string }> = {
      pending: { type: 'warning', text: '待确认' },
      confirmed: { type: 'primary', text: '已接单' },
      preparing: { type: 'primary', text: '制作中' },
      ready: { type: 'primary', text: '待取餐/已发货' },
      completed: { type: 'success', text: '已完成' },
      cancelled: { type: 'default', text: '已取消' },
    };
    const { type, text } = config[status];
    return <Tag type={type} size="small">{text}</Tag>;
  };

  const getDeliveryText = (mode: Order['deliveryMode']) => {
    const map = { pickup: '自取', local: '本地配送', express: '快递' };
    return map[mode];
  };

  const getDeliveryAddressText = (order: Order) => {
    if (order.deliveryMode === 'pickup') return '到店自取';
    if (order.deliveryAddress) {
      return `${order.deliveryAddress.name} ${order.deliveryAddress.phone} ${order.deliveryAddress.detail || ''}`;
    }
    return '';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const renderOrderCard = (order: Order) => (
    <view key={order.id} className="order-card" onClick={() => handleOrderClick(order)}>
      <view className="order-card__header">
        <text className="order-no">订单号：{order.orderNo}</text>
        {getStatusTag(order.status)}
      </view>

      <view className="order-card__items">
        {order.items.slice(0, 2).map(item => (
          <view key={item.id} className="order-item">
            <image
              className="order-item__image"
              src={item.image?.url || '/assets/images/placeholder.png'}
              mode="aspectFill"
            />
            <view className="order-item__info">
              <text className="order-item__name">{item.productName}</text>
              <text className="order-item__quantity">x{item.quantity}</text>
            </view>
          </view>
        ))}
        {order.items.length > 2 && (
          <text className="more-items">还有{order.items.length - 2}件商品</text>
        )}
      </view>

      <view className="order-card__footer">
        <view className="order-info">
          <text className="order-time">{formatDate(order.createdAt)}</text>
          <text className="order-delivery">{getDeliveryText(order.deliveryMode)}</text>
        </view>
        <view className="order-amount">
          <text className="amount-label">实付</text>
          <Price value={order.finalAmount} size="medium" />
        </view>
      </view>

      {order.status === 'pending' && (
        <view className="order-card__action">
          <Button type="primary" size="small" onClick={(e) => { e.stopPropagation(); handleOrderClick(order); }}>
            立即支付
          </Button>
        </view>
      )}
    </view>
  );

  const filteredOrders = getFilteredOrders();

  return (
    <view className="orders-page">
      {/* 顶部 Tab */}
      <view className="order-tabs">
        {tabs.map(tab => (
          <view
            key={tab.key}
            className={`order-tab ${activeTab === tab.key ? 'order-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <text>{tab.label}</text>
          </view>
        ))}
      </view>

      {/* 订单列表 */}
      <view className="order-list">
        {isLoading ? (
          <Loading text="加载中..." />
        ) : filteredOrders.length === 0 ? (
          <Empty text="暂无订单" />
        ) : (
          filteredOrders.map(renderOrderCard)
        )}
      </view>
    </view>
  );
};

export default Orders;

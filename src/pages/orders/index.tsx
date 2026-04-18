import React, { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { Order, OrderStatus, ORDER_STATUS_TEXT } from '@/shared/types/order';
import { Button, Price, Empty, Loading, Tag } from '@/components/ui';
import './index.scss';

// Mock 订单数据
const mockOrders: Order[] = [
  {
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
        image: { url: 'https://picsum.photos/200/200?random=20' },
        quantity: 1,
        unitPrice: 68,
        totalPrice: 68,
        pricingSnapshot: { type: 'fixed', price: 68, unit: '份' },
      },
      {
        id: 'oi002',
        productId: 'p002',
        productName: '麻辣鸭脖',
        image: { url: 'https://picsum.photos/200/200?random=21' },
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
  {
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
        image: { url: 'https://picsum.photos/200/200?random=22' },
        quantity: 3,
        unitPrice: 18,
        totalPrice: 54,
        pricingSnapshot: { type: 'fixed', price: 18, unit: '份' },
      },
    ],
    totalAmount: 54,
    finalAmount: 54,
    deliveryMode: 'local',
    deliveryFee: 5,
    deliveryAddress: { name: '张三', phone: '138****8888', detail: 'XX小区1号楼101' },
    pricingSnapshots: [],
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-14T14:35:00Z',
  },
  {
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
        image: { url: 'https://picsum.photos/200/200?random=23' },
        quantity: 1,
        unitPrice: 48,
        totalPrice: 48,
        pricingSnapshot: { type: 'weight', pricePerJin: 48, minWeight: 0.5, stepWeight: 0.5 },
      },
    ],
    totalAmount: 53,
    finalAmount: 53,
    deliveryMode: 'pickup',
    pricingSnapshots: [],
    createdAt: '2024-01-13T18:00:00Z',
    updatedAt: '2024-01-13T19:30:00Z',
    completedAt: '2024-01-13T19:30:00Z',
  },
  {
    id: 'o004',
    tenantId: 't001',
    customerId: 'c001',
    orderNo: 'ORD202401120004',
    status: 'cancelled',
    items: [
      {
        id: 'oi005',
        productId: 'p005',
        productName: '卤味拼盘（自选）',
        image: { url: 'https://picsum.photos/200/200?random=24' },
        quantity: 1,
        unitPrice: 22,
        totalPrice: 22,
        pricingSnapshot: { type: 'custom', options: [] },
      },
    ],
    totalAmount: 22,
    finalAmount: 22,
    deliveryMode: 'pickup',
    pricingSnapshots: [],
    createdAt: '2024-01-12T20:00:00Z',
    updatedAt: '2024-01-12T20:15:00Z',
    cancelledAt: '2024-01-12T20:15:00Z',
    cancelReason: '不需要了',
  },
];

type TabType = 'all' | 'pending' | 'processing' | 'completed';

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

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      setOrders(mockOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
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
      url: `/pages/order-detail/index?orderNo=${order.orderNo}`,
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

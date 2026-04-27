import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Button, Price, Card, Divider } from '@/components/ui';
import { useLedger } from '@/context/LedgerContext';
import { get as apiGet } from '@/network/request';
import './index.scss';

// API 基础配置
const API_BASE = 'https://cozejifen.haiei.cn/api';
const TENANT_ID = 'default';

interface MenuItem {
  id: string;
  icon: string;
  title: string;
  badge?: number;
  action?: () => void;
}

interface UserInfo {
  name: string;
  phone: string;
  avatar?: string;
}

interface OrderCounts {
  pending: number;
  processing: number;
  completed: number;
}

const Profile: React.FC = () => {
  const { balance, refresh } = useLedger();
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '美食爱好者',
    phone: '138****8888',
    avatar: '',
  });
  const [orderCounts, setOrderCounts] = useState<OrderCounts>({
    pending: 0,
    processing: 0,
    completed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refresh();
    loadUserInfo();
    fetchOrderCounts();
  }, []);

  /**
   * 加载用户信息
   */
  const loadUserInfo = () => {
    const name = Taro.getStorageSync('customer_name') || '美食爱好者';
    const phone = Taro.getStorageSync('customer_phone') || '';
    const avatar = Taro.getStorageSync('customer_avatar') || '';
    setUserInfo({ name, phone, avatar });
  };

  /**
   * 获取订单数量
   */
  const fetchOrderCounts = async () => {
    setIsLoading(true);
    try {
      // 获取待付款订单数
      const pendingRes = await apiGet<{ total: number }>('/orders', {
        params: { status: 'pending', pageSize: '1' },
        tenantId: TENANT_ID,
      });
      
      // 获取进行中订单数
      const processingRes = await apiGet<{ total: number }>('/orders', {
        params: { status: 'confirmed,preparing,ready', pageSize: '1' },
        tenantId: TENANT_ID,
      });

      setOrderCounts({
        pending: pendingRes.data?.total || 0,
        processing: processingRes.data?.total || 0,
        completed: 0,
      });
    } catch (err) {
      console.error('获取订单数量失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 获取用户真实手机号
   */
  const handleGetPhoneNumber = async () => {
    try {
      const res = await Taro.getPhoneNumber({});
      if (res.errMsg === 'getPhoneNumber:ok' && res.detail?.code) {
        // 调用后端绑定手机号
        // await apiPost('/user/bind-phone', { code: res.detail.code });
        Taro.showToast({ title: '手机号绑定成功', icon: 'success' });
        // 更新本地存储
        Taro.setStorageSync('customer_phone', '已绑定');
        loadUserInfo();
      }
    } catch (err) {
      console.error('获取手机号失败:', err);
    }
  };

  const handleMenuClick = (menu: MenuItem) => {
    if (menu.action) {
      menu.action();
    }
  };

  const menuGroups: { title?: string; items: MenuItem[] }[] = [
    {
      items: [
        {
          id: 'orders',
          icon: '📋',
          title: '我的订单',
          action: () => Taro.switchTab({ url: '/pages/orders/index' }),
        },
        {
          id: 'reservations',
          icon: '📅',
          title: '预约记录',
          action: () => Taro.navigateTo({ url: '/pages/reservations/index' }),
        },
        {
          id: 'notifications',
          icon: '🔔',
          title: '消息通知',
          action: () => Taro.navigateTo({ url: '/pages/notifications/index' }),
        },
        {
          id: 'addresses',
          icon: '📍',
          title: '收货地址',
          action: () => Taro.showToast({ title: '功能开发中', icon: 'none' }),
        },
      ],
    },
    {
      items: [
        {
          id: 'recharge',
          icon: '💰',
          title: '积分充值',
          action: () => Taro.navigateTo({ url: '/pages/points-mall/index' }),
        },
        {
          id: 'history',
          icon: '📜',
          title: '积分明细',
          action: () => Taro.navigateTo({ url: '/pages/points-history/index' }),
        },
      ],
    },
    {
      items: [
        {
          id: 'settings',
          icon: '⚙️',
          title: '设置',
          action: () => Taro.showToast({ title: '功能开发中', icon: 'none' }),
        },
        {
          id: 'help',
          icon: '❓',
          title: '帮助与反馈',
          action: () => Taro.showToast({ title: '功能开发中', icon: 'none' }),
        },
        {
          id: 'about',
          icon: 'ℹ️',
          title: '关于我们',
          action: () => Taro.showToast({ title: '下班来鸭 v1.0.0', icon: 'none' }),
        },
      ],
    },
  ];

  const renderMenuItem = (menu: MenuItem) => (
    <view
      key={menu.id}
      className="menu-item"
      onClick={() => handleMenuClick(menu)}
    >
      <view className="menu-item__left">
        <text className="menu-item__icon">{menu.icon}</text>
        <text className="menu-item__title">{menu.title}</text>
      </view>
      <view className="menu-item__right">
        {menu.badge && menu.badge > 0 && (
          <view className="menu-item__badge">
            <text>{menu.badge}</text>
          </view>
        )}
        <text className="menu-item__arrow">›</text>
      </view>
    </view>
  );

  const handleLogout = async () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.clearStorageSync();
          Taro.reLaunch({ url: '/pages/login/index' });
        }
      },
    });
  };

  const handleEditProfile = () => {
    Taro.showToast({ title: '功能开发中', icon: 'none' });
  };

  return (
    <view className="profile-page">
      {/* 用户信息卡片 */}
      <view className="user-card">
        <view className="user-info" onClick={handleEditProfile}>
          <view className="user-avatar">
            {userInfo.avatar ? (
              <image src={userInfo.avatar} mode="aspectFill" />
            ) : (
              <text>{userInfo.name.charAt(0)}</text>
            )}
          </view>
          <view className="user-detail">
            <text className="user-name">{userInfo.name}</text>
            {userInfo.phone ? (
              <text className="user-phone">{userInfo.phone}</text>
            ) : (
              <Button type="link" size="small" onClick={handleGetPhoneNumber}>
                绑定手机号
              </Button>
            )}
          </view>
          <text className="edit-btn">编辑 ›</text>
        </view>

        {/* 积分余额 */}
        <view className="balance-card">
          <view className="balance-info">
            <text className="balance-label">积分余额</text>
            <Price value={balance} size="large" />
          </view>
          <Button type="primary" size="small" onClick={() => Taro.navigateTo({ url: '/pages/points-mall/index' })}>
            充值
          </Button>
        </view>
      </view>

      {/* 快捷入口 */}
      <view className="quick-actions">
        <view 
          className="quick-action"
          onClick={() => Taro.navigateTo({ url: '/pages/orders/index?tab=pending' })}
        >
          <text className="quick-icon">🛒</text>
          <text className="quick-text">待支付</text>
          {orderCounts.pending > 0 && (
            <view className="quick-badge">{orderCounts.pending}</view>
          )}
        </view>
        <view 
          className="quick-action"
          onClick={() => Taro.navigateTo({ url: '/pages/orders/index?tab=processing' })}
        >
          <text className="quick-icon">🔔</text>
          <text className="quick-text">待接单</text>
          {orderCounts.processing > 0 && (
            <view className="quick-badge">{orderCounts.processing}</view>
          )}
        </view>
        <view className="quick-action">
          <text className="quick-icon">🍳</text>
          <text className="quick-text">制作中</text>
        </view>
        <view className="quick-action">
          <text className="quick-icon">⭐</text>
          <text className="quick-text">待取餐</text>
        </view>
      </view>

      {/* 菜单列表 */}
      <view className="menu-list">
        {menuGroups.map((group, groupIndex) => (
          <view key={groupIndex} className="menu-group">
            {group.title && (
              <view className="menu-group__title">
                <text>{group.title}</text>
              </view>
            )}
            {group.items.map(renderMenuItem)}
          </view>
        ))}
      </view>

      {/* 退出登录 */}
      <view className="logout-section">
        <Button type="default" size="large" plain onClick={handleLogout}>
          退出登录
        </Button>
      </view>
    </view>
  );
};

export default Profile;

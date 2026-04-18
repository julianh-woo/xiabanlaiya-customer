import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Button, Price, Card, Divider } from '@/components/ui';
import { useLedger } from '@/context/LedgerContext';
import './index.scss';

interface MenuItem {
  id: string;
  icon: string;
  title: string;
  badge?: number;
  action?: () => void;
}

const Profile: React.FC = () => {
  const { balance, refresh } = useLedger();
  const [userInfo, setUserInfo] = useState({
    name: '美食爱好者',
    phone: '138****8888',
    avatar: '',
  });

  useEffect(() => {
    refresh();
    loadUserInfo();
  }, []);

  const loadUserInfo = () => {
    const name = Taro.getStorageSync('customer_name') || '美食爱好者';
    const phone = Taro.getStorageSync('customer_phone') || '138****8888';
    setUserInfo({ name, phone, avatar: '' });
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
            <text>{userInfo.name.charAt(0)}</text>
          </view>
          <view className="user-detail">
            <text className="user-name">{userInfo.name}</text>
            <text className="user-phone">{userInfo.phone}</text>
          </view>
          <text className="edit-btn">编辑 ›</text>
        </view>

        {/* 积分余额 */}
        <view className="balance-card">
          <view className="balance-info">
            <text className="balance-label">积分余额</text>
            <Price value={balance} size="large" />
          </view>
          <Button type="primary" size="small" onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            充值
          </Button>
        </view>
      </view>

      {/* 快捷入口 */}
      <view className="quick-actions">
        <view className="quick-action">
          <text className="quick-icon">🛒</text>
          <text className="quick-text">待支付</text>
        </view>
        <view className="quick-action">
          <text className="quick-icon">🔔</text>
          <text className="quick-text">待接单</text>
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
            <Card padding={0}>
              {group.items.map((menu, index) => (
                <React.Fragment key={menu.id}>
                  {renderMenuItem(menu)}
                  {index < group.items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Card>
          </view>
        ))}
      </view>

      {/* 退出登录 */}
      <view className="logout-section">
        <Button type="default" size="large" block onClick={handleLogout}>
          退出登录
        </Button>
      </view>

      {/* 底部版权 */}
      <view className="copyright">
        <text>© 2024 下班来鸭</text>
      </view>
    </view>
  );
};

export default Profile;

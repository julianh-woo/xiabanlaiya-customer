import React, { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { useCart } from '@/context/CartContext';
import './index.scss';

interface TabItem {
  key: string;
  text: string;
  icon: string;
  activeIcon: string;
  path: string;
}

const tabs: TabItem[] = [
  {
    key: 'home',
    text: '首页',
    icon: '🏠',
    activeIcon: '🏠',
    path: '/pages/home/index',
  },
  {
    key: 'orders',
    text: '订单',
    icon: '📋',
    activeIcon: '📋',
    path: '/pages/orders/index',
  },
  {
    key: 'cart',
    text: '购物车',
    icon: '🛒',
    activeIcon: '🛒',
    path: '/pages/cart/index',
  },
  {
    key: 'profile',
    text: '我的',
    icon: '👤',
    activeIcon: '👤',
    path: '/pages/profile/index',
  },
];

interface CustomTabBarProps {
  selected?: string;
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({ selected = 'home' }) => {
  const { getItemCount } = useCart();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(getItemCount());
  }, [getItemCount]);

  const handleTabClick = (tab: TabItem) => {
    const currentPath = Taro.getCurrentPages().pop()?.route || '';
    const targetPath = tab.path.replace('/pages/', '').replace('/index', '');

    if (currentPath.includes(targetPath)) {
      return;
    }

    if (['home', 'orders', 'profile'].includes(tab.key)) {
      Taro.switchTab({ url: tab.path });
    } else {
      Taro.navigateTo({ url: tab.path });
    }
  };

  return (
    <view className="custom-tab-bar">
      {tabs.map((tab) => {
        const isSelected = selected === tab.key || 
          (selected === 'cart' && tab.key === 'cart');
        return (
          <view
            key={tab.key}
            className={`tab-bar-item ${isSelected ? 'tab-bar-item--active' : ''}`}
            onClick={() => handleTabClick(tab)}
          >
            <view className="tab-bar-icon">
              <text className="tab-bar-icon__text">{isSelected ? tab.activeIcon : tab.icon}</text>
              {tab.key === 'cart' && cartCount > 0 && (
                <view className="tab-bar-badge">
                  <text className="tab-bar-badge__text">
                    {cartCount > 99 ? '99+' : cartCount}
                  </text>
                </view>
              )}
            </view>
            <text className="tab-bar-text">{tab.text}</text>
          </view>
        );
      })}
    </view>
  );
};

export default CustomTabBar;
